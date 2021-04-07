  ```js
var functions = firebase.functions();
var incrementViews = functions.httpsCallable('incrementViews');
incrementViews({ id: '-MER32wsoZq_3In5uYs_' }).then((result) => {
    // Read result of the Function.
    var result = result.data.status;
  });
```
