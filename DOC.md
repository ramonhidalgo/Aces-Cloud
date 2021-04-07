 ## Sample implementation of the incrementView Firebase Function in JS
 ```js
const functions = firebase.functions();
const incrementViews = functions.httpsCallable('incrementViews');
incrementViews({ id: 'THE_ID_OF_THE_ARTICLE' }).then((result) => {
    // Read result of the Function.
    const result = result.data.status;
  });
```
