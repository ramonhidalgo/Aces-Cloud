 ## Sample implementations of the incrementView Firebase Function
 ### JS
 ```js
const functions = firebase.functions();
const incrementViews = functions.httpsCallable('incrementViews');
incrementViews({ id: 'THE_ID_OF_THE_ARTICLE' }).then((result) => {
    // Read result of the Function.
    const result = result.data.status;
  });
```
## Java
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
## Swift
```swift
lazy var functions = Functions.functions()
functions.httpsCallable("incrementViews").call(["id": THE_ID_OF_THE_ARTICLE ]) { (result, error) in
  // Do something with the result (for this function, there won't be anything to do with the result)
}
```
