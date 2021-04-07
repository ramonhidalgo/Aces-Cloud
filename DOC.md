var functions = firebase.functions();<br/>
var incrementViews = functions.httpsCallable('incrementViews');<br/>
incrementViews({ id: '-MER32wsoZq_3In5uYs_' }).then((result) => {<br/>
    // Read result of the Cloud Function.<br/>
    var getResult = result.data.status;<br/>
  })<br/>
