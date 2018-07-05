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
	.then(function(res){})
	.catch(function(res){ console.log(res) })
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJwb3N0V29ya2VyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbInRoaXMub25tZXNzYWdlID0gZnVuY3Rpb24oZSkge1xyXG5cdGZldGNoKFwiaHR0cDovL2xvY2FsaG9zdDoxMzM3L3Jldmlld3MvXCIsXHJcblx0e1xyXG5cdCAgICBoZWFkZXJzOiB7XHJcblx0ICAgICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuXHQgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcblx0ICAgIH0sXHJcblx0ICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcblx0ICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGUuZGF0YSlcclxuXHR9KVxyXG5cdC50aGVuKGZ1bmN0aW9uKHJlcyl7fSlcclxuXHQuY2F0Y2goZnVuY3Rpb24ocmVzKXsgY29uc29sZS5sb2cocmVzKSB9KVxyXG59Il0sImZpbGUiOiJwb3N0V29ya2VyLmpzIn0=
