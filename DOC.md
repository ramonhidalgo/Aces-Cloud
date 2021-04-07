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
