 ## Sample implementation of the incrementView Firebase Function in JS
 ```js
var functions = firebase.functions();
var incrementViews = functions.httpsCallable('incrementViews');
incrementViews({ id: 'THE_ID_OF_THE_ARTICLE' }).then((result) => {
    // Read result of the Function.
    var result = result.data.status;
  });
```
