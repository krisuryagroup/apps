export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  appVersion: '1.0.0', // App version fallback for web/browser
  google: {
    mapsApiKey:      'AIzaSyDCzOAMLNb1I0_ae9j4HXWO_ASjNkZFwMk',    // Maps Platform  — browser map rendering
    geocodingApiKey: 'AIzaSyCAt5Ce3rXl32E_fhnIJ-RvW61o1jyGblQ',     // Geocoding API  — reverse geocode & pincode lookup
    placesApiKey:    'AIzaSyCaoNihNhDQACOR6RgWJKbwfp4YgohoaFA',      // Places API     — search & nearby
    // Android Maps SDK key lives in android/app/src/main/res/values/strings.xml
  },
};
