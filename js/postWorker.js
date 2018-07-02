this.onmessage = function(e) {
	fetch("http://localhost:1337/reviews/",
	{
	    headers: {
	      'Accept': 'application/json',
	      'Content-Type': 'application/json'
	    },
	    method: "POST",
	    body: JSON.stringify(e.data)
	})
	.then(function(res){ console.log(res) })
	.catch(function(res){ console.log(res) })
}