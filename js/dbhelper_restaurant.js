/** 
 * Common database helper functions.
 */
class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }
  static get REVIEW_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/reviews/?restaurant_id=`;
  }

  static getRestaurantFromApi(url, callback) {
    var restaurantData = fetch(url)
      .then((response) => response.json())
      .then((response) => {

        if (DBHelper.db !== undefined) {
          var transaction = DBHelper.db.transaction(["restaurants"], "readwrite");
          var objectStore = transaction.objectStore("restaurants");

          if (Array.isArray(response)) {
            for (var i in response) {
              var request = objectStore.put(response[i]);
              request.onerror = () => {
                console.log("Couldnt be added")
              };
            }
          } else {
            var request = objectStore.put(response);
            request.onerror = () => {
              console.log("Couldnt be added")
            };
          }
        }

        callback(null, response);
      })
      .catch((e) => {
        const error = (`Request failed. ${e}`);
        callback(error, null);
      });
  }

  static getReviewsFromApi(url, callback) {
    var restaurantData = fetch(url)
      .then((response) => response.json())
      .then((response) => {

        if (DBHelper.db2 !== undefined) {
          var transaction = DBHelper.db2.transaction(["reviews"], "readwrite");
          var objectStore = transaction.objectStore("reviews");

          if (Array.isArray(response)) {
            for (var i in response) {
              delete response[i].id;
              var request = objectStore.put(response[i]);
              request.onerror = () => {
                console.log("Couldnt be added")
              };
            }
          } else {
            delete response.id;
            var request = objectStore.put(response);
            request.onerror = () => {
              console.log("Couldnt be added")
            };
          }
        }
        callback(null, response);
      })
      .catch((e) => {
        const error = (`Request failed. ${e}`);
        callback(error, null);
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    var url = DBHelper.DATABASE_URL + `/${id}`;
    if (DBHelper.db !== undefined) {
      var transaction = DBHelper.db.transaction(["restaurants"]);
      var objectStore = transaction.objectStore("restaurants");
      var request = objectStore.get(id);

      request.onsuccess = function(event) {

        if(request.result === undefined){
          callback("No restaurant found", null);
        }else{
          callback(null, request.result);
        }

      };

      request.onerror = function(event) {
      }
    }


    // Request to api to update indexedDB
    DBHelper.getRestaurantFromApi(url, callback);
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchReviewRestaurantById(id, callback) {

    var url = DBHelper.REVIEW_URL + `${id}`;
    if (DBHelper.db2 !== undefined) {
      var transaction = DBHelper.db2.transaction(["reviews"]);
      var index = transaction.objectStore("reviews").index("restaurant_id");
      var request = index.getAll(parseInt(id));

      request.onsuccess = function(event) {
        if(request.result === undefined){
          callback("No restaurant found", null);
        }else{
          var cacheReviews = request.result;
          callback(null, request.result);

          // Request to api to update indexedDB
          DBHelper.getReviewsFromApi(url, (error, response) => {

            var worker = new Worker("./js/updateApiWorker.js");
            var message = [cacheReviews, response];

            worker.postMessage(message);

            if(!request.result)
              callback(error,response);
          });
        }

      };

      request.onerror = function(event) {
        // Request to api to update indexedDB
        DBHelper.getReviewsFromApi(url, callback);
      }
    }

  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    });
    return marker;
  }

}