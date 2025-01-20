import { usePathname } from "expo-router";
import { Text, View } from "@/components/Themed";
import { StyleSheet, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import { truncTime, getLongDateDisplay } from "@/util/date";
import { WorkoutApi } from "@/api/workout";
import { Workout } from "@/interface";
import { HistoricalEditorSheet } from "@/components/popup/workout/historical/index";
import { useLiveIndicator } from "@/components/popup/workout/live/index";
import { useWorkout } from "@/context/WorkoutContext";
import { createWorkoutFromWorkout } from "@/util/workout";
import { PLACEHOLDER_WORKOUT } from "@/util/mock";
import { CompletedWorkout } from "./completed-workout";
import { useTabBar } from "@/components/util/tab-bar/context";
import { HeaderPage } from "@/components/util/header-page";
import { CalendarHeaderAction, Calendar } from "./calendar";
import { useWorkedOutDays } from "./hooks/use-worked-out-days";

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

  const { refetch, hasWorkedOut } = useWorkedOutDays(truncTime(Date.now()));
  const [workoutDate, setWorkoutDate] = useState<number>(truncTime(Date.now()));
  const [loading, setLoading] = useState<boolean>(true);
  const [completedWorkouts, setCompletedWorkouts] = useState<Workout[]>([]);
  const [workoutToUpdate, setWorkoutToUpdate] = useState<Workout>();
  const [showMonthCalendar, setShowMonthCalendar] = useState<boolean>(false);
  const { isInWorkout, actions } = useWorkout();

  const tabBarActions = useTabBar();
  const liveIndicatorActions = useLiveIndicator();

  const loadWorkouts = async () => {
    WorkoutApi.getWorkouts(truncTime(workoutDate))
      .then(setCompletedWorkouts)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWorkouts();
    refetch(workoutDate);
  }, [workoutDate]);

  useEffect(() => {
    loadWorkouts();
    refetch(workoutDate, true);
  }, [workoutToUpdate, isInWorkout, pathname]);

  useEffect(() => {
    if (workoutToUpdate) {
      tabBarActions.close();
      liveIndicatorActions.hide();
    } else {
      tabBarActions.open();
      liveIndicatorActions.show();
    }
  }, [workoutToUpdate]);

  return (
    <>
      <HeaderPage
        title={getLongDateDisplay(workoutDate)}
        rightAction={
          <CalendarHeaderAction
            toggle={() => setShowMonthCalendar((show) => !show)}
            showingMonthCalendar={showMonthCalendar}
          />
        }
      >
        <Calendar
          currentDate={workoutDate}
          onSelectDate={setWorkoutDate}
          showMonthCalendar={showMonthCalendar}
          isActive={hasWorkedOut}
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
      </HeaderPage>
      <HistoricalEditorSheet
        show={workoutToUpdate != undefined}
        hide={() => {
          setWorkoutToUpdate(undefined);
        }}
        onSave={(workout) => {
          WorkoutApi.saveWorkout(workout).then(() =>
            setWorkoutToUpdate(workout)
          );
        }}
        canRepeat={!isInWorkout}
        onRepeat={(workout) => {
          // todo: send an alert for why you can't start a workout if you are already in one
          actions.startWorkout(createWorkoutFromWorkout(workout));
        }}
        trash={() => WorkoutApi.deleteWorkout((workoutToUpdate as Workout).id)}
        workout={(workoutToUpdate ?? PLACEHOLDER_WORKOUT) as Workout}
      />
    </>
  );
}
