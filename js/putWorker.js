this.onmessage = function(e) {
	fetch("http://localhost:1337/restaurants/" + e.data[0] + "?is_favorite=" + e.data[1]==="true",
	{
	    headers: {
	      'Accept': 'application/json',
	      'Content-Type': 'application/json'
	    },
	    method: "PUT"
	})
	.catch(function(res){ console.log(res) })
}