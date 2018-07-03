this.onmessage = function(e) {
	var cacheReviews = e.data[0];
	var apiReviews = e.data[1];

	cacheReviews.forEach((element) => {
		var isIn = false;
		for(var j = 0; j < apiReviews.length && isIn === false; j++){
			if (JSON.stringify(element) === JSON.stringify(apiReviews[j])){
				isIn = true;
			}
		}	
		if (!isIn){			
			fetch("http://localhost:1337/reviews/",
			{
			    headers: {
			      'Accept': 'application/json',
			      'Content-Type': 'application/json'
			    },
			    method: "POST",
			    body: JSON.stringify(element)
			})
			.then(function(res){ console.log(res) })
			.catch(function(res){ console.log(res) })
		}
	});

	console.log(apiReviews);
	console.log(cacheReviews);
}