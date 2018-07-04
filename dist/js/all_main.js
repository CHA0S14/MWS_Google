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

        // Request to api to update indexedDB
        DBHelper.getFromApi(url, callback);
      };

      request.onerror = function(event) {
        // Request to api to update indexedDB
        DBHelper.getFromApi(url, callback);
      }
    } else{
      // Request to api to update indexedDB
      DBHelper.getFromApi(url, callback);
    }
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
let restaurants,
  neighborhoods,
  cuisines;
var map;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {


  fetchNeighborhoods();
  fetchCuisines();

});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

  if (!window.indexedDB) {
    window.alert("Su navegador no soporta una versión estable de indexedDB. Tal y como las características no serán validas");
    updateRestaurants();
  }

  // dejamos abierta nuestra base de datos
  let request = window.indexedDB.open("restaurants-json", 1);

  request.onerror = function(event) {
    alert("Why didn't you allow my web app to use IndexedDB?!");
  };
  request.onsuccess = function(event) {
    DBHelper.db = request.result;

    DBHelper.db.onerror = function(event) {
      // Generic error handler for all errors targeted at this database's
      // requests!
      alert("Database error: " + event.target.errorCode);
    };
  };

  // Este evento solamente está implementado en navegadores recientes
  request.onupgradeneeded = function(event) {
    var db = event.target.result;

    // Se crea un almacén para contener la información de nuestros cliente
    // Se usará "ssn" como clave ya que es garantizado que es única
    var objectStore = db.createObjectStore("restaurants", {
      keyPath: "id"
    });

    // Se crea un índice para buscar clientespor vecindario..
    objectStore.createIndex("neighborhood", "neighborhood", {
      unique: false
    });

    // Se crea un indice para buscar clientes por tipo de cocina
    objectStore.createIndex("cuisine_type", "cuisine_type", {
      unique: false
    });

    // Se crea un índice para buscar clientespor vecindario..
    objectStore.createIndex("neighborhood-cuisine_type", ["neighborhood", "cuisine_type"], {
      unique: false
    });
  };

   // dejamos abierta nuestra base de datos
  let request2 = window.indexedDB.open("favourites", 1);

  request2.onerror = function(event) {
    alert("Why didn't you allow my web app to use IndexedDB?!");
  };
  request2.onsuccess = function(event) {
    DBHelper.db2 = request2.result;

    updateRestaurants();

    DBHelper.db2.onerror = function(event) {
      // Generic error handler for all errors targeted at this database's
      // requests!
      alert("Database error: " + event.target.errorCode);
    };
  };

  // Este evento solamente está implementado en navegadores recientes
  request2.onupgradeneeded = function(event) {
    var db = event.target.result;

    // Se crea un almacén para contener la información de nuestros cliente
    // Se usará "ssn" como clave ya que es garantizado que es única
    var objectStore = db.createObjectStore("favourites", {
      keyPath: "restaurant_id"
    });
  };
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  });
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');

  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name + '\'s image';
  li.append(image);

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.setAttribute('aria-label', "Clic to view more information and reviews of " + restaurant.name);
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  const fav = document.createElement('a');
  fav.id = restaurant.id;

  var transaction = DBHelper.db2.transaction(["favourites"], "readwrite");
  var objectStore = transaction.objectStore("favourites");
  var id = parseInt(restaurant.id);
  var request = objectStore.get(id);

  request.onsuccess = function(event) {
    if(request.result === undefined){
      fav.innerHTML = '☆';
      objectStore.put({"restaurant_id":id, "fav":false});
    }else{
      if (!request.result.fav){
        fav.innerHTML = '☆';
      }else{
        fav.innerHTML = '★';
      }
    }
  };
    
  request.onerror = function(event) {
    console.log(request.result);
    fav.innerHTML = '☆';
  }

  fav.className="fav";
  fav.href = "#";

  fav.addEventListener("click",function(e){
    e.preventDefault();

    
    var transaction = DBHelper.db2.transaction(["favourites"], "readwrite");
    var objectStore = transaction.objectStore("favourites");
    var id = parseInt(fav.id);
    console.log(id);
    var request = objectStore.get(id);

    request.onsuccess = function(event) {
      if(request.result === undefined){
        fav.innerHTML = '☆';
        objectStore.put({"restaurant_id":id, "fav":false});
      }else{
        if (fav.innerHTML === '★'){
          fav.innerHTML = '☆';
          request.result.fav=false;
          objectStore.put(request.result);
        }else{
          request.result.fav=true;
          fav.innerHTML = '★';
          objectStore.put(request.result);
        }
      }
    };
      
    request.onerror = function(event) {
      console.log(request.result);
      fav.innerHTML = '☆';
    }
    
  });

  name.append(fav);

  return li;
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRiaGVscGVyX21haW4uanMiLCJtYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFsbF9tYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqIFxyXG4gKiBDb21tb24gZGF0YWJhc2UgaGVscGVyIGZ1bmN0aW9ucy5cclxuICovXHJcbmNsYXNzIERCSGVscGVyIHtcclxuICAvKipcclxuICAgKiBEYXRhYmFzZSBVUkwuXHJcbiAgICogQ2hhbmdlIHRoaXMgdG8gcmVzdGF1cmFudHMuanNvbiBmaWxlIGxvY2F0aW9uIG9uIHlvdXIgc2VydmVyLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBnZXQgREFUQUJBU0VfVVJMKCkge1xyXG4gICAgY29uc3QgcG9ydCA9IDEzMzc7IC8vIENoYW5nZSB0aGlzIHRvIHlvdXIgc2VydmVyIHBvcnRcclxuICAgIHJldHVybiBgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9L3Jlc3RhdXJhbnRzYDtcclxuICB9XHJcbiAgc3RhdGljIGdldCBSRVZJRVdfVVJMKCkge1xyXG4gICAgY29uc3QgcG9ydCA9IDEzMzc7IC8vIENoYW5nZSB0aGlzIHRvIHlvdXIgc2VydmVyIHBvcnRcclxuICAgIHJldHVybiBgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9L3Jldmlld3MvP3Jlc3RhdXJhbnRfaWQ9YDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGFsbCByZXN0YXVyYW50cy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50cyhjYWxsYmFjaykge1xyXG4gICAgaWYgKERCSGVscGVyLmRiICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdmFyIHRyYW5zYWN0aW9uID0gREJIZWxwZXIuZGIudHJhbnNhY3Rpb24oW1wicmVzdGF1cmFudHNcIl0pO1xyXG4gICAgICB2YXIgb2JqZWN0U3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpO1xyXG4gICAgICB2YXIgcmVxdWVzdCA9IG9iamVjdFN0b3JlLmdldEFsbCgpO1xyXG5cclxuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QucmVzdWx0KTtcclxuXHJcbiAgICAgICAgLy8gUmVxdWVzdCB0byBhcGkgdG8gdXBkYXRlIGluZGV4ZWREQlxyXG4gICAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMLCBjYWxsYmFjayk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMLCBjYWxsYmFjayk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMLCBjYWxsYmFjayk7XHJcbiAgICB9XHJcblxyXG4gIH1cclxuXHJcbiAgc3RhdGljIGdldEZyb21BcGkodXJsLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHJlc3RhdXJhbnREYXRhID0gZmV0Y2godXJsKVxyXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcblxyXG4gICAgICAgIGlmIChEQkhlbHBlci5kYiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB2YXIgdHJhbnNhY3Rpb24gPSBEQkhlbHBlci5kYi50cmFuc2FjdGlvbihbXCJyZXN0YXVyYW50c1wiXSwgXCJyZWFkd3JpdGVcIik7XHJcbiAgICAgICAgICB2YXIgb2JqZWN0U3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpO1xyXG5cclxuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlc3BvbnNlKSkge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIHJlc3BvbnNlKSB7XHJcblxyXG4gICAgICAgICAgICAgIHZhciByZXF1ZXN0ID0gb2JqZWN0U3RvcmUucHV0KHJlc3BvbnNlW2ldKTtcclxuXHJcbiAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb3VsZG50IGJlIGFkZGVkXCIpXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgdmFyIHJlcXVlc3QgPSBvYmplY3RTdG9yZS5wdXQocmVzcG9uc2UpO1xyXG5cclxuICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ291bGRudCBiZSBhZGRlZFwiKVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3BvbnNlKTtcclxuICAgICAgfSlcclxuICAgICAgLmNhdGNoKChlKSA9PiB7XHJcbiAgICAgICAgY29uc3QgZXJyb3IgPSAoYFJlcXVlc3QgZmFpbGVkLiAke2V9YCk7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGEgcmVzdGF1cmFudCBieSBpdHMgSUQuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoUmVzdGF1cmFudEJ5SWQoaWQsIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAoREJIZWxwZXIuZGIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB2YXIgdHJhbnNhY3Rpb24gPSBEQkhlbHBlci5kYi50cmFuc2FjdGlvbihbXCJyZXN0YXVyYW50c1wiXSk7XHJcbiAgICAgIHZhciBvYmplY3RTdG9yZSA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKFwicmVzdGF1cmFudHNcIik7XHJcbiAgICAgIHZhciByZXF1ZXN0ID0gb2JqZWN0U3RvcmUuZ2V0KGlkKTtcclxuICAgICAgdmFyIHVybCA9IERCSGVscGVyLkRBVEFCQVNFX1VSTCArIGAvJHtpZH1gO1xyXG5cclxuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIGlmKHJlcXVlc3QucmVzdWx0ID09PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgY2FsbGJhY2soXCJObyByZXN0YXVyYW50IGZvdW5kXCIsIG51bGwpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVxdWVzdC5yZXN1bHQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmVxdWVzdCB0byBhcGkgdG8gdXBkYXRlIGluZGV4ZWREQlxyXG4gICAgICAgIERCSGVscGVyLmdldEZyb21BcGkodXJsLCBjYWxsYmFjayk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIC8vIFJlcXVlc3QgdG8gYXBpIHRvIHVwZGF0ZSBpbmRleGVkREJcclxuICAgICAgICBEQkhlbHBlci5nZXRGcm9tQXBpKHVybCwgY2FsbGJhY2spO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2V7XHJcbiAgICAgIC8vIFJlcXVlc3QgdG8gYXBpIHRvIHVwZGF0ZSBpbmRleGVkREJcclxuICAgICAgREJIZWxwZXIuZ2V0RnJvbUFwaSh1cmwsIGNhbGxiYWNrKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIHJlc3RhdXJhbnRzIGJ5IGEgY3Vpc2luZSB0eXBlIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRCeUN1aXNpbmUoY3Vpc2luZSwgY2FsbGJhY2spIHtcclxuICAgIGlmIChEQkhlbHBlci5kYiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHZhciB0cmFuc2FjdGlvbiA9IERCSGVscGVyLmRiLnRyYW5zYWN0aW9uKFtcInJlc3RhdXJhbnRzXCJdKTtcclxuICAgICAgdmFyIGluZGV4ID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoXCJyZXN0YXVyYW50c1wiKS5pbmRleChcImN1aXNpbmVfdHlwZVwiKTtcclxuICAgICAgdmFyIHJlcXVlc3QgPSBpbmRleC5nZXRBbGwoY3Vpc2luZSk7XHJcblxyXG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVxdWVzdC5yZXN1bHQpO1xyXG5cclxuICAgICAgICAvLyBSZXF1ZXN0IHRvIGFwaSB0byB1cGRhdGUgaW5kZXhlZERCXHJcbiAgICAgICAgREJIZWxwZXIuZ2V0RnJvbUFwaShEQkhlbHBlci5EQVRBQkFTRV9VUkwgKyBgP2N1aXNpbmVfdHlwZT0ke2N1aXNpbmV9YCwgY2FsbGJhY2spO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICBEQkhlbHBlci5nZXRGcm9tQXBpKERCSGVscGVyLkRBVEFCQVNFX1VSTCArIGA/Y3Vpc2luZV90eXBlPSR7Y3Vpc2luZX1gLCBjYWxsYmFjayk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMICsgYD9jdWlzaW5lX3R5cGU9JHtjdWlzaW5lfWAsIGNhbGxiYWNrKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIHJlc3RhdXJhbnRzIGJ5IGEgbmVpZ2hib3Job29kIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRCeU5laWdoYm9yaG9vZChuZWlnaGJvcmhvb2QsIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAoREJIZWxwZXIuZGIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB2YXIgdHJhbnNhY3Rpb24gPSBEQkhlbHBlci5kYi50cmFuc2FjdGlvbihbXCJyZXN0YXVyYW50c1wiXSk7XHJcbiAgICAgIHZhciBpbmRleCA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKFwicmVzdGF1cmFudHNcIikuaW5kZXgoXCJuZWlnaGJvcmhvb2RcIik7XHJcbiAgICAgIHZhciByZXF1ZXN0ID0gaW5kZXguZ2V0QWxsKG5laWdoYm9yaG9vZCk7XHJcblxyXG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVxdWVzdC5yZXN1bHQpO1xyXG5cclxuICAgICAgICAvLyBSZXF1ZXN0IHRvIGFwaSB0byB1cGRhdGUgaW5kZXhlZERCXHJcbiAgICAgICAgREJIZWxwZXIuZ2V0RnJvbUFwaShEQkhlbHBlci5EQVRBQkFTRV9VUkwgKyBgP25laWdoYm9yaG9vZD0ke25laWdoYm9yaG9vZH1gLCBjYWxsYmFjayk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMICsgYD9uZWlnaGJvcmhvb2Q9JHtuZWlnaGJvcmhvb2R9YCwgY2FsbGJhY2spO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBEQkhlbHBlci5nZXRGcm9tQXBpKERCSGVscGVyLkRBVEFCQVNFX1VSTCArIGA/bmVpZ2hib3Job29kPSR7bmVpZ2hib3Job29kfWAsIGNhbGxiYWNrKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIHJlc3RhdXJhbnRzIGJ5IGEgY3Vpc2luZSBhbmQgYSBuZWlnaGJvcmhvb2Qgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmcuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoUmVzdGF1cmFudEJ5Q3Vpc2luZUFuZE5laWdoYm9yaG9vZChjdWlzaW5lLCBuZWlnaGJvcmhvb2QsIGNhbGxiYWNrKSB7XHJcblxyXG4gICAgaWYgKG5laWdoYm9yaG9vZCA9PT0gJ2FsbCcgJiYgY3Vpc2luZSA9PT0gJ2FsbCcpIHtcclxuICAgICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50cyhjYWxsYmFjayk7XHJcbiAgICB9IGVsc2UgaWYgKG5laWdoYm9yaG9vZCAhPT0gJ2FsbCcgJiYgY3Vpc2luZSA9PT0gJ2FsbCcpIHtcclxuICAgICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50QnlOZWlnaGJvcmhvb2QobmVpZ2hib3Job29kLCBjYWxsYmFjayk7XHJcbiAgICB9IGVsc2UgaWYgKG5laWdoYm9yaG9vZCA9PT0gJ2FsbCcgJiYgY3Vpc2luZSAhPT0gJ2FsbCcpIHtcclxuICAgICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50QnlDdWlzaW5lKGN1aXNpbmUsIGNhbGxiYWNrKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlmIChEQkhlbHBlci5kYiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdmFyIHRyYW5zYWN0aW9uID0gREJIZWxwZXIuZGIudHJhbnNhY3Rpb24oW1wicmVzdGF1cmFudHNcIl0pO1xyXG4gICAgICAgIHZhciBpbmRleCA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKFwicmVzdGF1cmFudHNcIikuaW5kZXgoXCJuZWlnaGJvcmhvb2QtY3Vpc2luZV90eXBlXCIpO1xyXG4gICAgICAgIHZhciByZXF1ZXN0ID0gaW5kZXguZ2V0QWxsKFtuZWlnaGJvcmhvb2QsIGN1aXNpbmVdKTtcclxuXHJcbiAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVxdWVzdC5yZXN1bHQpO1xyXG5cclxuICAgICAgICAgIC8vIFJlcXVlc3QgdG8gYXBpIHRvIHVwZGF0ZSBpbmRleGVkREJcclxuICAgICAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMICsgYD9uZWlnaGJvcmhvb2Q9JHtuZWlnaGJvcmhvb2R9JmN1aXNpbmVfdHlwZT0ke2N1aXNpbmV9YCwgY2FsbGJhY2spO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICBjYWxsYmFjayhcIkVycm9yIGZldGNoaW5nIHJlc3RhdXJhbnQgYnkgY3Vpc2luZSBhbmQgbmVpZ2hib3Job29kXCIsIG51bGwpO1xyXG4gICAgICAgICAgREJIZWxwZXIuZ2V0RnJvbUFwaShEQkhlbHBlci5EQVRBQkFTRV9VUkwgKyBgP25laWdoYm9yaG9vZD0ke25laWdoYm9yaG9vZH0mY3Vpc2luZV90eXBlPSR7Y3Vpc2luZX1gLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBEQkhlbHBlci5nZXRGcm9tQXBpKERCSGVscGVyLkRBVEFCQVNFX1VSTCArIGA/bmVpZ2hib3Job29kPSR7bmVpZ2hib3Job29kfSZjdWlzaW5lX3R5cGU9JHtjdWlzaW5lfWAsIGNhbGxiYWNrKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggYWxsIG5laWdoYm9yaG9vZHMgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmcuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoTmVpZ2hib3Job29kcyhjYWxsYmFjaykge1xyXG4gICAgLy8gRmV0Y2ggYWxsIHJlc3RhdXJhbnRzXHJcbiAgICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRzKChlcnJvciwgcmVzdGF1cmFudHMpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEdldCBhbGwgbmVpZ2hib3Job29kcyBmcm9tIGFsbCByZXN0YXVyYW50c1xyXG4gICAgICAgIGNvbnN0IG5laWdoYm9yaG9vZHMgPSByZXN0YXVyYW50cy5tYXAoKHYsIGkpID0+IHJlc3RhdXJhbnRzW2ldLm5laWdoYm9yaG9vZCk7XHJcbiAgICAgICAgLy8gUmVtb3ZlIGR1cGxpY2F0ZXMgZnJvbSBuZWlnaGJvcmhvb2RzXHJcbiAgICAgICAgY29uc3QgdW5pcXVlTmVpZ2hib3Job29kcyA9IG5laWdoYm9yaG9vZHMuZmlsdGVyKCh2LCBpKSA9PiBuZWlnaGJvcmhvb2RzLmluZGV4T2YodikgPT0gaSk7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgdW5pcXVlTmVpZ2hib3Job29kcyk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggYWxsIGN1aXNpbmVzIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaEN1aXNpbmVzKGNhbGxiYWNrKSB7XHJcbiAgICAvLyBGZXRjaCBhbGwgcmVzdGF1cmFudHNcclxuICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudHMoKGVycm9yLCByZXN0YXVyYW50cykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gR2V0IGFsbCBjdWlzaW5lcyBmcm9tIGFsbCByZXN0YXVyYW50c1xyXG4gICAgICAgIGNvbnN0IGN1aXNpbmVzID0gcmVzdGF1cmFudHMubWFwKCh2LCBpKSA9PiByZXN0YXVyYW50c1tpXS5jdWlzaW5lX3R5cGUpO1xyXG4gICAgICAgIC8vIFJlbW92ZSBkdXBsaWNhdGVzIGZyb20gY3Vpc2luZXNcclxuICAgICAgICBjb25zdCB1bmlxdWVDdWlzaW5lcyA9IGN1aXNpbmVzLmZpbHRlcigodiwgaSkgPT4gY3Vpc2luZXMuaW5kZXhPZih2KSA9PSBpKTtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB1bmlxdWVDdWlzaW5lcyk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVzdGF1cmFudCBwYWdlIFVSTC5cclxuICAgKi9cclxuICBzdGF0aWMgdXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSB7XHJcbiAgICByZXR1cm4gKGAuL3Jlc3RhdXJhbnQuaHRtbD9pZD0ke3Jlc3RhdXJhbnQuaWR9YCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZXN0YXVyYW50IGltYWdlIFVSTC5cclxuICAgKi9cclxuICBzdGF0aWMgaW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpIHtcclxuICAgIHJldHVybiAoYC9pbWcvJHtyZXN0YXVyYW50LnBob3RvZ3JhcGh9LmpwZ2ApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTWFwIG1hcmtlciBmb3IgYSByZXN0YXVyYW50LlxyXG4gICAqL1xyXG4gIHN0YXRpYyBtYXBNYXJrZXJGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQsIG1hcCkge1xyXG4gICAgY29uc3QgbWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICAgIHBvc2l0aW9uOiByZXN0YXVyYW50LmxhdGxuZyxcclxuICAgICAgdGl0bGU6IHJlc3RhdXJhbnQubmFtZSxcclxuICAgICAgdXJsOiBEQkhlbHBlci51cmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpLFxyXG4gICAgICBtYXA6IG1hcCxcclxuICAgICAgYW5pbWF0aW9uOiBnb29nbGUubWFwcy5BbmltYXRpb24uRFJPUFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gbWFya2VyO1xyXG4gIH1cclxuXHJcbn0iLCJsZXQgcmVzdGF1cmFudHMsXHJcbiAgbmVpZ2hib3Job29kcyxcclxuICBjdWlzaW5lcztcclxudmFyIG1hcDtcclxudmFyIG1hcmtlcnMgPSBbXTtcclxuXHJcbi8qKlxyXG4gKiBGZXRjaCBuZWlnaGJvcmhvb2RzIGFuZCBjdWlzaW5lcyBhcyBzb29uIGFzIHRoZSBwYWdlIGlzIGxvYWRlZC5cclxuICovXHJcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoZXZlbnQpID0+IHtcclxuXHJcblxyXG4gIGZldGNoTmVpZ2hib3Job29kcygpO1xyXG4gIGZldGNoQ3Vpc2luZXMoKTtcclxuXHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIEZldGNoIGFsbCBuZWlnaGJvcmhvb2RzIGFuZCBzZXQgdGhlaXIgSFRNTC5cclxuICovXHJcbmZldGNoTmVpZ2hib3Job29kcyA9ICgpID0+IHtcclxuICBEQkhlbHBlci5mZXRjaE5laWdoYm9yaG9vZHMoKGVycm9yLCBuZWlnaGJvcmhvb2RzKSA9PiB7XHJcbiAgICBpZiAoZXJyb3IpIHsgLy8gR290IGFuIGVycm9yXHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2VsZi5uZWlnaGJvcmhvb2RzID0gbmVpZ2hib3Job29kcztcclxuICAgICAgZmlsbE5laWdoYm9yaG9vZHNIVE1MKCk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZXQgbmVpZ2hib3Job29kcyBIVE1MLlxyXG4gKi9cclxuZmlsbE5laWdoYm9yaG9vZHNIVE1MID0gKG5laWdoYm9yaG9vZHMgPSBzZWxmLm5laWdoYm9yaG9vZHMpID0+IHtcclxuICBjb25zdCBzZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbmVpZ2hib3Job29kcy1zZWxlY3QnKTtcclxuICBuZWlnaGJvcmhvb2RzLmZvckVhY2gobmVpZ2hib3Job29kID0+IHtcclxuICAgIGNvbnN0IG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpO1xyXG4gICAgb3B0aW9uLmlubmVySFRNTCA9IG5laWdoYm9yaG9vZDtcclxuICAgIG9wdGlvbi52YWx1ZSA9IG5laWdoYm9yaG9vZDtcclxuICAgIHNlbGVjdC5hcHBlbmQob3B0aW9uKTtcclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZldGNoIGFsbCBjdWlzaW5lcyBhbmQgc2V0IHRoZWlyIEhUTUwuXHJcbiAqL1xyXG5mZXRjaEN1aXNpbmVzID0gKCkgPT4ge1xyXG4gIERCSGVscGVyLmZldGNoQ3Vpc2luZXMoKGVycm9yLCBjdWlzaW5lcykgPT4ge1xyXG4gICAgaWYgKGVycm9yKSB7IC8vIEdvdCBhbiBlcnJvciFcclxuICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzZWxmLmN1aXNpbmVzID0gY3Vpc2luZXM7XHJcbiAgICAgIGZpbGxDdWlzaW5lc0hUTUwoKTtcclxuICAgIH1cclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNldCBjdWlzaW5lcyBIVE1MLlxyXG4gKi9cclxuZmlsbEN1aXNpbmVzSFRNTCA9IChjdWlzaW5lcyA9IHNlbGYuY3Vpc2luZXMpID0+IHtcclxuICBjb25zdCBzZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3Vpc2luZXMtc2VsZWN0Jyk7XHJcblxyXG4gIGN1aXNpbmVzLmZvckVhY2goY3Vpc2luZSA9PiB7XHJcbiAgICBjb25zdCBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcclxuICAgIG9wdGlvbi5pbm5lckhUTUwgPSBjdWlzaW5lO1xyXG4gICAgb3B0aW9uLnZhbHVlID0gY3Vpc2luZTtcclxuICAgIHNlbGVjdC5hcHBlbmQob3B0aW9uKTtcclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEluaXRpYWxpemUgR29vZ2xlIG1hcCwgY2FsbGVkIGZyb20gSFRNTC5cclxuICovXHJcbndpbmRvdy5pbml0TWFwID0gKCkgPT4ge1xyXG4gIGxldCBsb2MgPSB7XHJcbiAgICBsYXQ6IDQwLjcyMjIxNixcclxuICAgIGxuZzogLTczLjk4NzUwMVxyXG4gIH07XHJcbiAgc2VsZi5tYXAgPSBuZXcgZ29vZ2xlLm1hcHMuTWFwKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAnKSwge1xyXG4gICAgem9vbTogMTIsXHJcbiAgICBjZW50ZXI6IGxvYyxcclxuICAgIHNjcm9sbHdoZWVsOiBmYWxzZVxyXG4gIH0pO1xyXG4gIHZhciBpbmRleGVkREIgPSB3aW5kb3cuaW5kZXhlZERCIHx8IHdpbmRvdy5tb3pJbmRleGVkREIgfHwgd2luZG93LndlYmtpdEluZGV4ZWREQiB8fCB3aW5kb3cubXNJbmRleGVkREIgfHwgd2luZG93LnNoaW1JbmRleGVkREI7XHJcblxyXG4gIGlmICghd2luZG93LmluZGV4ZWREQikge1xyXG4gICAgd2luZG93LmFsZXJ0KFwiU3UgbmF2ZWdhZG9yIG5vIHNvcG9ydGEgdW5hIHZlcnNpw7NuIGVzdGFibGUgZGUgaW5kZXhlZERCLiBUYWwgeSBjb21vIGxhcyBjYXJhY3RlcsOtc3RpY2FzIG5vIHNlcsOhbiB2YWxpZGFzXCIpO1xyXG4gICAgdXBkYXRlUmVzdGF1cmFudHMoKTtcclxuICB9XHJcblxyXG4gIC8vIGRlamFtb3MgYWJpZXJ0YSBudWVzdHJhIGJhc2UgZGUgZGF0b3NcclxuICBsZXQgcmVxdWVzdCA9IHdpbmRvdy5pbmRleGVkREIub3BlbihcInJlc3RhdXJhbnRzLWpzb25cIiwgMSk7XHJcblxyXG4gIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICBhbGVydChcIldoeSBkaWRuJ3QgeW91IGFsbG93IG15IHdlYiBhcHAgdG8gdXNlIEluZGV4ZWREQj8hXCIpO1xyXG4gIH07XHJcbiAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgREJIZWxwZXIuZGIgPSByZXF1ZXN0LnJlc3VsdDtcclxuXHJcbiAgICBEQkhlbHBlci5kYi5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgLy8gR2VuZXJpYyBlcnJvciBoYW5kbGVyIGZvciBhbGwgZXJyb3JzIHRhcmdldGVkIGF0IHRoaXMgZGF0YWJhc2Unc1xyXG4gICAgICAvLyByZXF1ZXN0cyFcclxuICAgICAgYWxlcnQoXCJEYXRhYmFzZSBlcnJvcjogXCIgKyBldmVudC50YXJnZXQuZXJyb3JDb2RlKTtcclxuICAgIH07XHJcbiAgfTtcclxuXHJcbiAgLy8gRXN0ZSBldmVudG8gc29sYW1lbnRlIGVzdMOhIGltcGxlbWVudGFkbyBlbiBuYXZlZ2Fkb3JlcyByZWNpZW50ZXNcclxuICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICB2YXIgZGIgPSBldmVudC50YXJnZXQucmVzdWx0O1xyXG5cclxuICAgIC8vIFNlIGNyZWEgdW4gYWxtYWPDqW4gcGFyYSBjb250ZW5lciBsYSBpbmZvcm1hY2nDs24gZGUgbnVlc3Ryb3MgY2xpZW50ZVxyXG4gICAgLy8gU2UgdXNhcsOhIFwic3NuXCIgY29tbyBjbGF2ZSB5YSBxdWUgZXMgZ2FyYW50aXphZG8gcXVlIGVzIMO6bmljYVxyXG4gICAgdmFyIG9iamVjdFN0b3JlID0gZGIuY3JlYXRlT2JqZWN0U3RvcmUoXCJyZXN0YXVyYW50c1wiLCB7XHJcbiAgICAgIGtleVBhdGg6IFwiaWRcIlxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2UgY3JlYSB1biDDrW5kaWNlIHBhcmEgYnVzY2FyIGNsaWVudGVzcG9yIHZlY2luZGFyaW8uLlxyXG4gICAgb2JqZWN0U3RvcmUuY3JlYXRlSW5kZXgoXCJuZWlnaGJvcmhvb2RcIiwgXCJuZWlnaGJvcmhvb2RcIiwge1xyXG4gICAgICB1bmlxdWU6IGZhbHNlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZSBjcmVhIHVuIGluZGljZSBwYXJhIGJ1c2NhciBjbGllbnRlcyBwb3IgdGlwbyBkZSBjb2NpbmFcclxuICAgIG9iamVjdFN0b3JlLmNyZWF0ZUluZGV4KFwiY3Vpc2luZV90eXBlXCIsIFwiY3Vpc2luZV90eXBlXCIsIHtcclxuICAgICAgdW5pcXVlOiBmYWxzZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2UgY3JlYSB1biDDrW5kaWNlIHBhcmEgYnVzY2FyIGNsaWVudGVzcG9yIHZlY2luZGFyaW8uLlxyXG4gICAgb2JqZWN0U3RvcmUuY3JlYXRlSW5kZXgoXCJuZWlnaGJvcmhvb2QtY3Vpc2luZV90eXBlXCIsIFtcIm5laWdoYm9yaG9vZFwiLCBcImN1aXNpbmVfdHlwZVwiXSwge1xyXG4gICAgICB1bmlxdWU6IGZhbHNlXHJcbiAgICB9KTtcclxuICB9O1xyXG5cclxuICAgLy8gZGVqYW1vcyBhYmllcnRhIG51ZXN0cmEgYmFzZSBkZSBkYXRvc1xyXG4gIGxldCByZXF1ZXN0MiA9IHdpbmRvdy5pbmRleGVkREIub3BlbihcImZhdm91cml0ZXNcIiwgMSk7XHJcblxyXG4gIHJlcXVlc3QyLm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgYWxlcnQoXCJXaHkgZGlkbid0IHlvdSBhbGxvdyBteSB3ZWIgYXBwIHRvIHVzZSBJbmRleGVkREI/IVwiKTtcclxuICB9O1xyXG4gIHJlcXVlc3QyLm9uc3VjY2VzcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICBEQkhlbHBlci5kYjIgPSByZXF1ZXN0Mi5yZXN1bHQ7XHJcblxyXG4gICAgdXBkYXRlUmVzdGF1cmFudHMoKTtcclxuXHJcbiAgICBEQkhlbHBlci5kYjIub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgIC8vIEdlbmVyaWMgZXJyb3IgaGFuZGxlciBmb3IgYWxsIGVycm9ycyB0YXJnZXRlZCBhdCB0aGlzIGRhdGFiYXNlJ3NcclxuICAgICAgLy8gcmVxdWVzdHMhXHJcbiAgICAgIGFsZXJ0KFwiRGF0YWJhc2UgZXJyb3I6IFwiICsgZXZlbnQudGFyZ2V0LmVycm9yQ29kZSk7XHJcbiAgICB9O1xyXG4gIH07XHJcblxyXG4gIC8vIEVzdGUgZXZlbnRvIHNvbGFtZW50ZSBlc3TDoSBpbXBsZW1lbnRhZG8gZW4gbmF2ZWdhZG9yZXMgcmVjaWVudGVzXHJcbiAgcmVxdWVzdDIub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgIHZhciBkYiA9IGV2ZW50LnRhcmdldC5yZXN1bHQ7XHJcblxyXG4gICAgLy8gU2UgY3JlYSB1biBhbG1hY8OpbiBwYXJhIGNvbnRlbmVyIGxhIGluZm9ybWFjacOzbiBkZSBudWVzdHJvcyBjbGllbnRlXHJcbiAgICAvLyBTZSB1c2Fyw6EgXCJzc25cIiBjb21vIGNsYXZlIHlhIHF1ZSBlcyBnYXJhbnRpemFkbyBxdWUgZXMgw7puaWNhXHJcbiAgICB2YXIgb2JqZWN0U3RvcmUgPSBkYi5jcmVhdGVPYmplY3RTdG9yZShcImZhdm91cml0ZXNcIiwge1xyXG4gICAgICBrZXlQYXRoOiBcInJlc3RhdXJhbnRfaWRcIlxyXG4gICAgfSk7XHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFVwZGF0ZSBwYWdlIGFuZCBtYXAgZm9yIGN1cnJlbnQgcmVzdGF1cmFudHMuXHJcbiAqL1xyXG51cGRhdGVSZXN0YXVyYW50cyA9ICgpID0+IHtcclxuICBjb25zdCBjU2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2N1aXNpbmVzLXNlbGVjdCcpO1xyXG4gIGNvbnN0IG5TZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbmVpZ2hib3Job29kcy1zZWxlY3QnKTtcclxuXHJcbiAgY29uc3QgY0luZGV4ID0gY1NlbGVjdC5zZWxlY3RlZEluZGV4O1xyXG4gIGNvbnN0IG5JbmRleCA9IG5TZWxlY3Quc2VsZWN0ZWRJbmRleDtcclxuXHJcbiAgY29uc3QgY3Vpc2luZSA9IGNTZWxlY3RbY0luZGV4XS52YWx1ZTtcclxuICBjb25zdCBuZWlnaGJvcmhvb2QgPSBuU2VsZWN0W25JbmRleF0udmFsdWU7XHJcblxyXG4gIERCSGVscGVyLmZldGNoUmVzdGF1cmFudEJ5Q3Vpc2luZUFuZE5laWdoYm9yaG9vZChjdWlzaW5lLCBuZWlnaGJvcmhvb2QsIChlcnJvciwgcmVzdGF1cmFudHMpID0+IHtcclxuICAgIGlmIChlcnJvcikgeyAvLyBHb3QgYW4gZXJyb3IhXHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmVzZXRSZXN0YXVyYW50cyhyZXN0YXVyYW50cyk7XHJcbiAgICAgIGZpbGxSZXN0YXVyYW50c0hUTUwoKTtcclxuICAgIH1cclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENsZWFyIGN1cnJlbnQgcmVzdGF1cmFudHMsIHRoZWlyIEhUTUwgYW5kIHJlbW92ZSB0aGVpciBtYXAgbWFya2Vycy5cclxuICovXHJcbnJlc2V0UmVzdGF1cmFudHMgPSAocmVzdGF1cmFudHMpID0+IHtcclxuICAvLyBSZW1vdmUgYWxsIHJlc3RhdXJhbnRzXHJcbiAgc2VsZi5yZXN0YXVyYW50cyA9IFtdO1xyXG4gIGNvbnN0IHVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnRzLWxpc3QnKTtcclxuICB1bC5pbm5lckhUTUwgPSAnJztcclxuXHJcbiAgLy8gUmVtb3ZlIGFsbCBtYXAgbWFya2Vyc1xyXG4gIHNlbGYubWFya2Vycy5mb3JFYWNoKG0gPT4gbS5zZXRNYXAobnVsbCkpO1xyXG4gIHNlbGYubWFya2VycyA9IFtdO1xyXG4gIHNlbGYucmVzdGF1cmFudHMgPSByZXN0YXVyYW50cztcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBhbGwgcmVzdGF1cmFudHMgSFRNTCBhbmQgYWRkIHRoZW0gdG8gdGhlIHdlYnBhZ2UuXHJcbiAqL1xyXG5maWxsUmVzdGF1cmFudHNIVE1MID0gKHJlc3RhdXJhbnRzID0gc2VsZi5yZXN0YXVyYW50cykgPT4ge1xyXG4gIGNvbnN0IHVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnRzLWxpc3QnKTtcclxuXHJcbiAgcmVzdGF1cmFudHMuZm9yRWFjaChyZXN0YXVyYW50ID0+IHtcclxuICAgIHVsLmFwcGVuZChjcmVhdGVSZXN0YXVyYW50SFRNTChyZXN0YXVyYW50KSk7XHJcbiAgfSk7XHJcbiAgYWRkTWFya2Vyc1RvTWFwKCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgcmVzdGF1cmFudCBIVE1MLlxyXG4gKi9cclxuY3JlYXRlUmVzdGF1cmFudEhUTUwgPSAocmVzdGF1cmFudCkgPT4ge1xyXG4gIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuXHJcbiAgY29uc3QgaW1hZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcclxuICBpbWFnZS5jbGFzc05hbWUgPSAncmVzdGF1cmFudC1pbWcnO1xyXG4gIGltYWdlLnNyYyA9IERCSGVscGVyLmltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KTtcclxuICBpbWFnZS5hbHQgPSByZXN0YXVyYW50Lm5hbWUgKyAnXFwncyBpbWFnZSc7XHJcbiAgbGkuYXBwZW5kKGltYWdlKTtcclxuXHJcbiAgY29uc3QgbmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2gxJyk7XHJcbiAgbmFtZS5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5hbWU7XHJcbiAgbGkuYXBwZW5kKG5hbWUpO1xyXG5cclxuICBjb25zdCBuZWlnaGJvcmhvb2QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XHJcbiAgbmVpZ2hib3Job29kLmlubmVySFRNTCA9IHJlc3RhdXJhbnQubmVpZ2hib3Job29kO1xyXG4gIGxpLmFwcGVuZChuZWlnaGJvcmhvb2QpO1xyXG5cclxuICBjb25zdCBhZGRyZXNzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gIGFkZHJlc3MuaW5uZXJIVE1MID0gcmVzdGF1cmFudC5hZGRyZXNzO1xyXG4gIGxpLmFwcGVuZChhZGRyZXNzKTtcclxuXHJcbiAgY29uc3QgbW9yZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcclxuICBtb3JlLmlubmVySFRNTCA9ICdWaWV3IERldGFpbHMnO1xyXG4gIG1vcmUuc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgXCJDbGljIHRvIHZpZXcgbW9yZSBpbmZvcm1hdGlvbiBhbmQgcmV2aWV3cyBvZiBcIiArIHJlc3RhdXJhbnQubmFtZSk7XHJcbiAgbW9yZS5ocmVmID0gREJIZWxwZXIudXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KTtcclxuICBsaS5hcHBlbmQobW9yZSk7XHJcblxyXG4gIGNvbnN0IGZhdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcclxuICBmYXYuaWQgPSByZXN0YXVyYW50LmlkO1xyXG5cclxuICB2YXIgdHJhbnNhY3Rpb24gPSBEQkhlbHBlci5kYjIudHJhbnNhY3Rpb24oW1wiZmF2b3VyaXRlc1wiXSwgXCJyZWFkd3JpdGVcIik7XHJcbiAgdmFyIG9iamVjdFN0b3JlID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoXCJmYXZvdXJpdGVzXCIpO1xyXG4gIHZhciBpZCA9IHBhcnNlSW50KHJlc3RhdXJhbnQuaWQpO1xyXG4gIHZhciByZXF1ZXN0ID0gb2JqZWN0U3RvcmUuZ2V0KGlkKTtcclxuXHJcbiAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgaWYocmVxdWVzdC5yZXN1bHQgPT09IHVuZGVmaW5lZCl7XHJcbiAgICAgIGZhdi5pbm5lckhUTUwgPSAn4piGJztcclxuICAgICAgb2JqZWN0U3RvcmUucHV0KHtcInJlc3RhdXJhbnRfaWRcIjppZCwgXCJmYXZcIjpmYWxzZX0pO1xyXG4gICAgfWVsc2V7XHJcbiAgICAgIGlmICghcmVxdWVzdC5yZXN1bHQuZmF2KXtcclxuICAgICAgICBmYXYuaW5uZXJIVE1MID0gJ+KYhic7XHJcbiAgICAgIH1lbHNle1xyXG4gICAgICAgIGZhdi5pbm5lckhUTUwgPSAn4piFJztcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH07XHJcbiAgICBcclxuICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgY29uc29sZS5sb2cocmVxdWVzdC5yZXN1bHQpO1xyXG4gICAgZmF2LmlubmVySFRNTCA9ICfimIYnO1xyXG4gIH1cclxuXHJcbiAgZmF2LmNsYXNzTmFtZT1cImZhdlwiO1xyXG4gIGZhdi5ocmVmID0gXCIjXCI7XHJcblxyXG4gIGZhdi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIixmdW5jdGlvbihlKXtcclxuICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICBcclxuICAgIHZhciB0cmFuc2FjdGlvbiA9IERCSGVscGVyLmRiMi50cmFuc2FjdGlvbihbXCJmYXZvdXJpdGVzXCJdLCBcInJlYWR3cml0ZVwiKTtcclxuICAgIHZhciBvYmplY3RTdG9yZSA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKFwiZmF2b3VyaXRlc1wiKTtcclxuICAgIHZhciBpZCA9IHBhcnNlSW50KGZhdi5pZCk7XHJcbiAgICBjb25zb2xlLmxvZyhpZCk7XHJcbiAgICB2YXIgcmVxdWVzdCA9IG9iamVjdFN0b3JlLmdldChpZCk7XHJcblxyXG4gICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICBpZihyZXF1ZXN0LnJlc3VsdCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgICBmYXYuaW5uZXJIVE1MID0gJ+KYhic7XHJcbiAgICAgICAgb2JqZWN0U3RvcmUucHV0KHtcInJlc3RhdXJhbnRfaWRcIjppZCwgXCJmYXZcIjpmYWxzZX0pO1xyXG4gICAgICB9ZWxzZXtcclxuICAgICAgICBpZiAoZmF2LmlubmVySFRNTCA9PT0gJ+KYhScpe1xyXG4gICAgICAgICAgZmF2LmlubmVySFRNTCA9ICfimIYnO1xyXG4gICAgICAgICAgcmVxdWVzdC5yZXN1bHQuZmF2PWZhbHNlO1xyXG4gICAgICAgICAgb2JqZWN0U3RvcmUucHV0KHJlcXVlc3QucmVzdWx0KTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgIHJlcXVlc3QucmVzdWx0LmZhdj10cnVlO1xyXG4gICAgICAgICAgZmF2LmlubmVySFRNTCA9ICfimIUnO1xyXG4gICAgICAgICAgb2JqZWN0U3RvcmUucHV0KHJlcXVlc3QucmVzdWx0KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgICAgIFxyXG4gICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgY29uc29sZS5sb2cocmVxdWVzdC5yZXN1bHQpO1xyXG4gICAgICBmYXYuaW5uZXJIVE1MID0gJ+KYhic7XHJcbiAgICB9XHJcbiAgICBcclxuICB9KTtcclxuXHJcbiAgbmFtZS5hcHBlbmQoZmF2KTtcclxuXHJcbiAgcmV0dXJuIGxpO1xyXG59XHJcblxyXG4vKipcclxuICogQWRkIG1hcmtlcnMgZm9yIGN1cnJlbnQgcmVzdGF1cmFudHMgdG8gdGhlIG1hcC5cclxuICovXHJcbmFkZE1hcmtlcnNUb01hcCA9IChyZXN0YXVyYW50cyA9IHNlbGYucmVzdGF1cmFudHMpID0+IHtcclxuICByZXN0YXVyYW50cy5mb3JFYWNoKHJlc3RhdXJhbnQgPT4ge1xyXG4gICAgLy8gQWRkIG1hcmtlciB0byB0aGUgbWFwXHJcbiAgICBjb25zdCBtYXJrZXIgPSBEQkhlbHBlci5tYXBNYXJrZXJGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQsIHNlbGYubWFwKTtcclxuICAgIGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKG1hcmtlciwgJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IG1hcmtlci51cmw7XHJcbiAgICB9KTtcclxuICAgIHNlbGYubWFya2Vycy5wdXNoKG1hcmtlcik7XHJcbiAgfSk7XHJcbn0iXX0=
