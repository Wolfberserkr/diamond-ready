import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BookingsListScreen } from "./screens/BookingsList";
import { NewBookingScreen } from "./screens/NewBooking";
import { BookingShareScreen } from "./screens/BookingShare";
import { SignInScreen } from "./screens/SignIn";
import { useSession } from "./lib/useSession";

export type RootStackParamList = {
  SignIn: undefined;
  BookingsList: undefined;
  NewBooking: undefined;
  BookingShare: {
    bookingId: string;
    bookingUrl: string;
    whatsappMessage: string;
    whatsappShareUrl: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const session = useSession();
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: "#0e1320" },
            headerTintColor: "#f4f6fb",
          }}
        >
          {!session ? (
            <Stack.Screen
              name="SignIn"
              component={SignInScreen}
              options={{ title: "Sign in" }}
            />
          ) : (
            <>
              <Stack.Screen
                name="BookingsList"
                component={BookingsListScreen}
                options={{ title: "Bookings" }}
              />
              <Stack.Screen
                name="NewBooking"
                component={NewBookingScreen}
                options={{ title: "New booking" }}
              />
              <Stack.Screen
                name="BookingShare"
                component={BookingShareScreen}
                options={{ title: "Share" }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
