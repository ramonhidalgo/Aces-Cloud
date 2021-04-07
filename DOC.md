 ## Sample implementation of the incrementView Firebase Function in JS
 ```js
const functions = firebase.functions();
const incrementViews = functions.httpsCallable('incrementViews');
incrementViews({ id: 'THE_ID_OF_THE_ARTICLE' }).then((result) => {
    // Read result of the Function.
    const result = result.data.status;
  });
```

```java
FirebaseFunctions functions = FirebaseFunctions.getInstance();
public Task<String> incrementViews(String articleId) {
    // Create the arguments to the callable function.
    Map<String, Object> data = new HashMap<>();
    data.put("id", articleId);
    
    return functions
            .getHttpsCallable("incrementViews")
            .call(data)
            .continueWith(new Continuation<HttpsCallableResult, String>() {
                @Override
                public String then(@NonNull Task<HttpsCallableResult> task) throws Exception {
                    // Get the result (normaly returns {status: "Good"})
                    String result = (String) task.getResult().getData();
                    return result;
                }
            });
}
```
