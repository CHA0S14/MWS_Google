this.onmessage = function(e) {
	var cacheReviews = e.data[0];
	var apiReviews = e.data[1];

	cacheReviews.forEach((element) => {
		for(var j = 0; j < apiReviews.length; j++){
			if (element.id === apiReviews[j].id && element.is_favorite!==apiReviews[j].is_favorite){

				fetch("http://localhost:1337/restaurants/" + element.id + "?is_favorite=" + element.is_favorite,
				{
				    headers: {
				      'Accept': 'application/json',
				      'Content-Type': 'application/json'
				    },
				    method: "PUT"
				}).catch(function(res){ console.log(res) })

			}
		}	
	});

	console.log(apiReviews);
	console.log(cacheReviews);
}