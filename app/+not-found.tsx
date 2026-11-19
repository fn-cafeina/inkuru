import { Redirect } from 'expo-router';

/** A deep link to a route that does not exist lands on the library. */
export default function NotFound() {
  return <Redirect href="/" />;
}
