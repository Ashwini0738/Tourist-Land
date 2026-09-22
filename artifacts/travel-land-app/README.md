# Travel & Land mobile app

## Razorpay checkout

Razorpay checkout uses the native `react-native-razorpay` module. Expo Go does
not contain this module, so payment checkout must be tested in an EAS
development or preview build:

```sh
eas build --profile development --platform android
eas build --profile preview --platform android
```

The rest of the app remains usable in Expo Go. If checkout is opened there, the
app shows a clear message that a native EAS build is required.

Razorpay credentials belong on the API server only. Never add
`RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` to Expo configuration or to
an `EXPO_PUBLIC_*` variable. The API returns only the public key ID with a
server-created order.