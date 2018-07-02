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

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    if (DBHelper.db !== undefined) {
      var transaction = DBHelper.db.transaction(["restaurants"]);
      var objectStore = transaction.objectStore("restaurants");
      var request = objectStore.getAll();

      request.onsuccess = function(event) {
        callback(null, request.result);

        // Request to api to update indexedDB
        DBHelper.getFromApi(DBHelper.DATABASE_URL, callback);
      };

      request.onerror = function(event) {
        DBHelper.getFromApi(DBHelper.DATABASE_URL, callback);
      }
    } else {
      DBHelper.getFromApi(DBHelper.DATABASE_URL, callback);
    }

  }

  static getFromApi(url, callback) {
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

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    if (DBHelper.db !== undefined) {
      var transaction = DBHelper.db.transaction(["restaurants"]);
      var objectStore = transaction.objectStore("restaurants");
      var request = objectStore.get(id);
      var url = DBHelper.DATABASE_URL + `/${id}`;

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
    DBHelper.getFromApi(url, callback);
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    if (DBHelper.db !== undefined) {
      var transaction = DBHelper.db.transaction(["restaurants"]);
      var index = transaction.objectStore("restaurants").index("cuisine_type");
      var request = index.getAll(cuisine);

      request.onsuccess = function(event) {
        callback(null, request.result);

        // Request to api to update indexedDB
        DBHelper.getFromApi(DBHelper.DATABASE_URL + `?cuisine_type=${cuisine}`, callback);
      };

      request.onerror = function(event) {
        DBHelper.getFromApi(DBHelper.DATABASE_URL + `?cuisine_type=${cuisine}`, callback);
      }
    } else {
      DBHelper.getFromApi(DBHelper.DATABASE_URL + `?cuisine_type=${cuisine}`, callback);
    }
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    if (DBHelper.db !== undefined) {
      var transaction = DBHelper.db.transaction(["restaurants"]);
      var index = transaction.objectStore("restaurants").index("neighborhood");
      var request = index.getAll(neighborhood);

      request.onsuccess = function(event) {
        callback(null, request.result);

        // Request to api to update indexedDB
        DBHelper.getFromApi(DBHelper.DATABASE_URL + `?neighborhood=${neighborhood}`, callback);
      };

      request.onerror = function(event) {
        DBHelper.getFromApi(DBHelper.DATABASE_URL + `?neighborhood=${neighborhood}`, callback);
      }
    } else {
      DBHelper.getFromApi(DBHelper.DATABASE_URL + `?neighborhood=${neighborhood}`, callback);
    }
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {

    if (neighborhood === 'all' && cuisine === 'all') {
      DBHelper.fetchRestaurants(callback);
    } else if (neighborhood !== 'all' && cuisine === 'all') {
      DBHelper.fetchRestaurantByNeighborhood(neighborhood, callback);
    } else if (neighborhood === 'all' && cuisine !== 'all') {
      DBHelper.fetchRestaurantByCuisine(cuisine, callback);
    } else {
      if (DBHelper.db !== undefined) {
        var transaction = DBHelper.db.transaction(["restaurants"]);
        var index = transaction.objectStore("restaurants").index("neighborhood-cuisine_type");
        var request = index.getAll([neighborhood, cuisine]);

        request.onsuccess = function(event) {
          callback(null, request.result);

          // Request to api to update indexedDB
          DBHelper.getFromApi(DBHelper.DATABASE_URL + `?neighborhood=${neighborhood}&cuisine_type=${cuisine}`, callback);
        };

        request.onerror = function(event) {
          callback("Error fetching restaurant by cuisine and neighborhood", null);
          DBHelper.getFromApi(DBHelper.DATABASE_URL + `?neighborhood=${neighborhood}&cuisine_type=${cuisine}`, callback);
        }

      } else {
        DBHelper.getFromApi(DBHelper.DATABASE_URL + `?neighborhood=${neighborhood}&cuisine_type=${cuisine}`, callback);
      }
    }
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        callback(null, uniqueCuisines);
      }
    });
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