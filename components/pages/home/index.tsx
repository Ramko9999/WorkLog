import { usePathname } from "expo-router";
import { Text, View } from "@/components/Themed";
import { StyleSheet, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import { truncTime, getLongDateDisplay } from "@/util/date";
import { WorkoutApi } from "@/api/workout";
import { Workout } from "@/interface";
import { HistoricalEditorSheet } from "@/components/popup/workout/historical/index";
import { useLiveIndicator } from "@/components/popup/workout/live/index";
import { WorkoutCalendar } from "./calendar";
import * as Haptics from "expo-haptics";
import { DynamicHeaderPage } from "@/components/util/dynamic-header-page";
import { useWorkout } from "@/context/WorkoutContext";
import { createWorkoutFromWorkout } from "@/util/workout";
import { PLACEHOLDER_WORKOUT } from "@/util/mock";
import { CompletedWorkout } from "./completed-workout";

const styles = StyleSheet.create({
  homeView: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  expansiveCenterAlignedView: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  workoutItineraryView: {
    flexDirection: "row",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "600",
    fontSize: 16,
  },
  headerView: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    justifyContent: "center",
  },
  headerAction: {
    padding: "8%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
  },
  workoutView: {
    display: "flex",
    flexDirection: "column",
    height: "80%",
    alignItems: "center",
  },
  workoutViewTiles: {
    display: "flex",
    flexDirection: "column",
    margin: 20,
    width: "100%",
    backgroundColor: "transparent",
    alignItems: "center",
    gap: 20,
  },
  workoutViewPlan: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 5,
    width: "100%",
    backgroundColor: "transparent",
  },
  header: {
    height: "15%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    paddingLeft: "5%",
  },
});

function WorkoutItineraryLoading() {
  return (
    <View _type="background" style={styles.expansiveCenterAlignedView}>
      <Text _type="neutral">Loading workouts...</Text>
    </View>
  );
}

type CompletedWorkoutsProps = {
  workouts: Workout[];
  onClickWorkout: (_: Workout) => void;
};

function CompletedWorkouts({
  workouts,
  onClickWorkout,
}: CompletedWorkoutsProps) {
  const isRestDay = workouts.length === 0;

  return isRestDay ? (
    <View style={styles.expansiveCenterAlignedView} collapsable={false}>
      <Text _type="neutral">It's a rest day. Take it easy :)</Text>
    </View>
  ) : (
    <ScrollView>
      <View style={styles.workoutView} collapsable={false}>
        <View style={styles.workoutViewTiles}>
          {workouts.map((workout, index) => (
            <CompletedWorkout
              key={index}
              workout={workout}
              onClick={() => onClickWorkout(workout)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

export default function Home() {
  const pathname = usePathname();
  const [workoutDate, setWorkoutDate] = useState<number>(truncTime(Date.now()));
  const [loading, setLoading] = useState<boolean>(true);
  const [completedWorkouts, setCompletedWorkouts] = useState<Workout[]>([]);
  const [workoutToUpdate, setWorkoutToUpdate] = useState<Workout>();
  const { isInWorkout, actions } = useWorkout();

  const liveIndicatorActions = useLiveIndicator();

  const loadWorkouts = async () => {
    WorkoutApi.getWorkouts(truncTime(workoutDate))
      .then(setCompletedWorkouts)
      .catch((error) => console.log(error))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWorkouts();
  }, [workoutDate, pathname]);

  return (
    <>
      <DynamicHeaderPage title={getLongDateDisplay(workoutDate)}>
        <WorkoutCalendar
          currentDate={workoutDate}
          onSelectDate={(date) => {
            setWorkoutDate(date);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        />
        {loading ? (
          <WorkoutItineraryLoading />
        ) : (
          <>
            <CompletedWorkouts
              workouts={completedWorkouts}
              onClickWorkout={(workout: Workout) => {
                liveIndicatorActions.hide();
                setWorkoutToUpdate(workout);
              }}
            />
          </>
        )}
      </DynamicHeaderPage>
      <HistoricalEditorSheet
        show={workoutToUpdate != undefined}
        hide={() => {
          // todo: consolidate logic for hiding and showing the editor sheet in one place
          liveIndicatorActions.show();
          loadWorkouts();
          setWorkoutToUpdate(undefined);
        }}
        onSave={(workout) => {
          WorkoutApi.saveWorkout(workout).then(() =>
            setWorkoutToUpdate(workout)
          );
        }}
        onRepeat={(workout) => {
          // todo: send an alert for why you can't start a workout if you are already in one
          // todo: make closing smoother
          if (isInWorkout) {
            console.log("Cannot start a workout as you are already in one");
          } else {
            const repeatedWorkout = createWorkoutFromWorkout(workout);
            setWorkoutToUpdate(undefined);
            actions.startWorkout(repeatedWorkout);
            liveIndicatorActions.show();
          }
        }}
        trash={() => {
          WorkoutApi.deleteWorkout((workoutToUpdate as Workout).id).then(() => {
            setWorkoutToUpdate(undefined);
            liveIndicatorActions.show();
            loadWorkouts();
          });
        }}
        workout={(workoutToUpdate ?? PLACEHOLDER_WORKOUT) as Workout}
      />
    </>
  );
}
