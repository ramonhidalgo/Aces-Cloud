const firebase = require("firebase");
// Required for side-effects
require("firebase/functions");

const firebaseConfig = {
    apiKey: "AIzaSyDEUekXeyIKJUreRaX78lsEYBt8JGHYmHE",
    authDomain: "arcadia-high-mobile.firebaseapp.com",
    databaseURL: "https://arcadia-high-mobile.firebaseio.com",
    projectId: "arcadia-high-mobile",
    storageBucket: "arcadia-high-mobile.appspot.com",
    messagingSenderId: "654225823864",
    appId: "1:654225823864:web:944772a5cadae0c8b7758d"
  };

firebase.initializeApp(firebaseConfig);
var functions = firebase.functions();
var incrementViews = functions.httpsCallable('incrementViews');
incrementViews({ id: '-MER32wsoZq_3In5uYs_' }).then((result) => {
    // Read result of the Cloud Function.
    var sanitizedMessage = result.data.status;
  }).catch((error) => {
    // Getting the Error details.
    var code = error.code;
    var message = error.message;
    var details = error.details;
    console.log(message)
    console.log(details)
  });;