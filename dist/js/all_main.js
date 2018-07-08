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
        var cacheReviews = request.result;

        var restaurantData = fetch(DBHelper.DATABASE_URL)
        .then((response) => response.json())
        .then((response) => {


          var worker = new Worker("./js/updaterFavApiWorker.js");
          var message = [cacheReviews, response];

          worker.postMessage(message);

          if(request.result.length === 0)
            DBHelper.getFromApi(DBHelper.DATABASE_URL, callback);

          callback(null,response);
        });
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
              response[i].is_favorite = response[i].is_favorite + "";
              var request = objectStore.put(response[i]);


              request.onerror = () => {
                console.log("Couldnt be added")
              };
              
            }
          } else {
            response.is_favorite = response.is_favorite + "";
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

    updateRestaurants();

    registerSW();

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

  const name = document.createElement('h3');
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

  if (!restaurant.is_favorite || restaurant.is_favorite==="false"){
    fav.innerHTML = '☆';
  }else{
    fav.innerHTML = '★';
  }


  fav.className="fav";
  fav.href = "#";

  fav.addEventListener("click",function(e){
    e.preventDefault();

    
    var transaction = DBHelper.db.transaction(["restaurants"], "readwrite");
    var objectStore = transaction.objectStore("restaurants");
    var id = parseInt(fav.id);

    if (fav.innerHTML === '★'){
      fav.innerHTML = '☆';
      restaurant.is_favorite = false;
      objectStore.put(restaurant);

    }else{
      fav.innerHTML = '★';
      restaurant.is_favorite = true;
      objectStore.put(restaurant);
    }

    var worker = new Worker("./js/putWorker.js");

    var message = [id, restaurant.is_favorite];

    worker.postMessage(message);
    
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
function registerSW() {    

    if (navigator.serviceWorker) {
        navigator.serviceWorker.register('sw.js').then(function (reg) {
            if (!navigator.serviceWorker.controller) {
                return;
            }

            if (reg.waiting) {
                updateReady(reg.waiting);
                return;
            }

            if (reg.installing) {
                trackInstalling(reg.installing);
                return;
            }

            reg.addEventListener('updatefound', function () {
                trackInstalling(reg.installing);
            });
        });

        var refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
        
    }
}

updateReady = function (worker) {
    worker.postMessage({ action: 'skipWaiting' });
};

trackInstalling = function (worker) {
    worker.addEventListener('statechange', function () {
        if (worker.state == 'installed') {
            updateReady(worker);
        }
    });
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRiaGVscGVyX21haW4uanMiLCJtYWluLmpzIiwic3dSZWdpc3Rlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFsbF9tYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqIFxyXG4gKiBDb21tb24gZGF0YWJhc2UgaGVscGVyIGZ1bmN0aW9ucy5cclxuICovXHJcbmNsYXNzIERCSGVscGVyIHtcclxuICAvKipcclxuICAgKiBEYXRhYmFzZSBVUkwuXHJcbiAgICogQ2hhbmdlIHRoaXMgdG8gcmVzdGF1cmFudHMuanNvbiBmaWxlIGxvY2F0aW9uIG9uIHlvdXIgc2VydmVyLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBnZXQgREFUQUJBU0VfVVJMKCkge1xyXG4gICAgY29uc3QgcG9ydCA9IDEzMzc7IC8vIENoYW5nZSB0aGlzIHRvIHlvdXIgc2VydmVyIHBvcnRcclxuICAgIHJldHVybiBgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9L3Jlc3RhdXJhbnRzYDtcclxuICB9XHJcbiAgc3RhdGljIGdldCBSRVZJRVdfVVJMKCkge1xyXG4gICAgY29uc3QgcG9ydCA9IDEzMzc7IC8vIENoYW5nZSB0aGlzIHRvIHlvdXIgc2VydmVyIHBvcnRcclxuICAgIHJldHVybiBgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9L3Jldmlld3MvP3Jlc3RhdXJhbnRfaWQ9YDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGFsbCByZXN0YXVyYW50cy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50cyhjYWxsYmFjaykge1xyXG4gICAgaWYgKERCSGVscGVyLmRiICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdmFyIHRyYW5zYWN0aW9uID0gREJIZWxwZXIuZGIudHJhbnNhY3Rpb24oW1wicmVzdGF1cmFudHNcIl0pO1xyXG4gICAgICB2YXIgb2JqZWN0U3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpO1xyXG4gICAgICB2YXIgcmVxdWVzdCA9IG9iamVjdFN0b3JlLmdldEFsbCgpO1xyXG5cclxuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciBjYWNoZVJldmlld3MgPSByZXF1ZXN0LnJlc3VsdDtcclxuXHJcbiAgICAgICAgdmFyIHJlc3RhdXJhbnREYXRhID0gZmV0Y2goREJIZWxwZXIuREFUQUJBU0VfVVJMKVxyXG4gICAgICAgIC50aGVuKChyZXNwb25zZSkgPT4gcmVzcG9uc2UuanNvbigpKVxyXG4gICAgICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xyXG5cclxuXHJcbiAgICAgICAgICB2YXIgd29ya2VyID0gbmV3IFdvcmtlcihcIi4vanMvdXBkYXRlckZhdkFwaVdvcmtlci5qc1wiKTtcclxuICAgICAgICAgIHZhciBtZXNzYWdlID0gW2NhY2hlUmV2aWV3cywgcmVzcG9uc2VdO1xyXG5cclxuICAgICAgICAgIHdvcmtlci5wb3N0TWVzc2FnZShtZXNzYWdlKTtcclxuXHJcbiAgICAgICAgICBpZihyZXF1ZXN0LnJlc3VsdC5sZW5ndGggPT09IDApXHJcbiAgICAgICAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMLCBjYWxsYmFjayk7XHJcblxyXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCxyZXNwb25zZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMLCBjYWxsYmFjayk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMLCBjYWxsYmFjayk7XHJcbiAgICB9XHJcblxyXG4gIH1cclxuXHJcbiAgc3RhdGljIGdldEZyb21BcGkodXJsLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHJlc3RhdXJhbnREYXRhID0gZmV0Y2godXJsKVxyXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcblxyXG4gICAgICAgIGlmIChEQkhlbHBlci5kYiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB2YXIgdHJhbnNhY3Rpb24gPSBEQkhlbHBlci5kYi50cmFuc2FjdGlvbihbXCJyZXN0YXVyYW50c1wiXSwgXCJyZWFkd3JpdGVcIik7XHJcbiAgICAgICAgICB2YXIgb2JqZWN0U3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpO1xyXG5cclxuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlc3BvbnNlKSkge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgcmVzcG9uc2VbaV0uaXNfZmF2b3JpdGUgPSByZXNwb25zZVtpXS5pc19mYXZvcml0ZSArIFwiXCI7XHJcbiAgICAgICAgICAgICAgdmFyIHJlcXVlc3QgPSBvYmplY3RTdG9yZS5wdXQocmVzcG9uc2VbaV0pO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb3VsZG50IGJlIGFkZGVkXCIpXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmVzcG9uc2UuaXNfZmF2b3JpdGUgPSByZXNwb25zZS5pc19mYXZvcml0ZSArIFwiXCI7XHJcbiAgICAgICAgICAgIHZhciByZXF1ZXN0ID0gb2JqZWN0U3RvcmUucHV0KHJlc3BvbnNlKTtcclxuXHJcbiAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvdWxkbnQgYmUgYWRkZWRcIilcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYWxsYmFjayhudWxsLCByZXNwb25zZSk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5jYXRjaCgoZSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGVycm9yID0gKGBSZXF1ZXN0IGZhaWxlZC4gJHtlfWApO1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCBhIHJlc3RhdXJhbnQgYnkgaXRzIElELlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRCeUlkKGlkLCBjYWxsYmFjaykge1xyXG4gICAgaWYgKERCSGVscGVyLmRiICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdmFyIHRyYW5zYWN0aW9uID0gREJIZWxwZXIuZGIudHJhbnNhY3Rpb24oW1wicmVzdGF1cmFudHNcIl0pO1xyXG4gICAgICB2YXIgb2JqZWN0U3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpO1xyXG4gICAgICB2YXIgcmVxdWVzdCA9IG9iamVjdFN0b3JlLmdldChpZCk7XHJcbiAgICAgIHZhciB1cmwgPSBEQkhlbHBlci5EQVRBQkFTRV9VUkwgKyBgLyR7aWR9YDtcclxuXHJcbiAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICBpZihyZXF1ZXN0LnJlc3VsdCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgIGNhbGxiYWNrKFwiTm8gcmVzdGF1cmFudCBmb3VuZFwiLCBudWxsKTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QucmVzdWx0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlcXVlc3QgdG8gYXBpIHRvIHVwZGF0ZSBpbmRleGVkREJcclxuICAgICAgICBEQkhlbHBlci5nZXRGcm9tQXBpKHVybCwgY2FsbGJhY2spO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAvLyBSZXF1ZXN0IHRvIGFwaSB0byB1cGRhdGUgaW5kZXhlZERCXHJcbiAgICAgICAgREJIZWxwZXIuZ2V0RnJvbUFwaSh1cmwsIGNhbGxiYWNrKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNle1xyXG4gICAgICAvLyBSZXF1ZXN0IHRvIGFwaSB0byB1cGRhdGUgaW5kZXhlZERCXHJcbiAgICAgIERCSGVscGVyLmdldEZyb21BcGkodXJsLCBjYWxsYmFjayk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCByZXN0YXVyYW50cyBieSBhIGN1aXNpbmUgdHlwZSB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50QnlDdWlzaW5lKGN1aXNpbmUsIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAoREJIZWxwZXIuZGIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB2YXIgdHJhbnNhY3Rpb24gPSBEQkhlbHBlci5kYi50cmFuc2FjdGlvbihbXCJyZXN0YXVyYW50c1wiXSk7XHJcbiAgICAgIHZhciBpbmRleCA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKFwicmVzdGF1cmFudHNcIikuaW5kZXgoXCJjdWlzaW5lX3R5cGVcIik7XHJcbiAgICAgIHZhciByZXF1ZXN0ID0gaW5kZXguZ2V0QWxsKGN1aXNpbmUpO1xyXG5cclxuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QucmVzdWx0KTtcclxuXHJcbiAgICAgICAgLy8gUmVxdWVzdCB0byBhcGkgdG8gdXBkYXRlIGluZGV4ZWREQlxyXG4gICAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMICsgYD9jdWlzaW5lX3R5cGU9JHtjdWlzaW5lfWAsIGNhbGxiYWNrKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgREJIZWxwZXIuZ2V0RnJvbUFwaShEQkhlbHBlci5EQVRBQkFTRV9VUkwgKyBgP2N1aXNpbmVfdHlwZT0ke2N1aXNpbmV9YCwgY2FsbGJhY2spO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBEQkhlbHBlci5nZXRGcm9tQXBpKERCSGVscGVyLkRBVEFCQVNFX1VSTCArIGA/Y3Vpc2luZV90eXBlPSR7Y3Vpc2luZX1gLCBjYWxsYmFjayk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCByZXN0YXVyYW50cyBieSBhIG5laWdoYm9yaG9vZCB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50QnlOZWlnaGJvcmhvb2QobmVpZ2hib3Job29kLCBjYWxsYmFjaykge1xyXG4gICAgaWYgKERCSGVscGVyLmRiICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdmFyIHRyYW5zYWN0aW9uID0gREJIZWxwZXIuZGIudHJhbnNhY3Rpb24oW1wicmVzdGF1cmFudHNcIl0pO1xyXG4gICAgICB2YXIgaW5kZXggPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpLmluZGV4KFwibmVpZ2hib3Job29kXCIpO1xyXG4gICAgICB2YXIgcmVxdWVzdCA9IGluZGV4LmdldEFsbChuZWlnaGJvcmhvb2QpO1xyXG5cclxuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QucmVzdWx0KTtcclxuXHJcbiAgICAgICAgLy8gUmVxdWVzdCB0byBhcGkgdG8gdXBkYXRlIGluZGV4ZWREQlxyXG4gICAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMICsgYD9uZWlnaGJvcmhvb2Q9JHtuZWlnaGJvcmhvb2R9YCwgY2FsbGJhY2spO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICBEQkhlbHBlci5nZXRGcm9tQXBpKERCSGVscGVyLkRBVEFCQVNFX1VSTCArIGA/bmVpZ2hib3Job29kPSR7bmVpZ2hib3Job29kfWAsIGNhbGxiYWNrKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgREJIZWxwZXIuZ2V0RnJvbUFwaShEQkhlbHBlci5EQVRBQkFTRV9VUkwgKyBgP25laWdoYm9yaG9vZD0ke25laWdoYm9yaG9vZH1gLCBjYWxsYmFjayk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCByZXN0YXVyYW50cyBieSBhIGN1aXNpbmUgYW5kIGEgbmVpZ2hib3Job29kIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRCeUN1aXNpbmVBbmROZWlnaGJvcmhvb2QoY3Vpc2luZSwgbmVpZ2hib3Job29kLCBjYWxsYmFjaykge1xyXG5cclxuICAgIGlmIChuZWlnaGJvcmhvb2QgPT09ICdhbGwnICYmIGN1aXNpbmUgPT09ICdhbGwnKSB7XHJcbiAgICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudHMoY2FsbGJhY2spO1xyXG4gICAgfSBlbHNlIGlmIChuZWlnaGJvcmhvb2QgIT09ICdhbGwnICYmIGN1aXNpbmUgPT09ICdhbGwnKSB7XHJcbiAgICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudEJ5TmVpZ2hib3Job29kKG5laWdoYm9yaG9vZCwgY2FsbGJhY2spO1xyXG4gICAgfSBlbHNlIGlmIChuZWlnaGJvcmhvb2QgPT09ICdhbGwnICYmIGN1aXNpbmUgIT09ICdhbGwnKSB7XHJcbiAgICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudEJ5Q3Vpc2luZShjdWlzaW5lLCBjYWxsYmFjayk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpZiAoREJIZWxwZXIuZGIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHZhciB0cmFuc2FjdGlvbiA9IERCSGVscGVyLmRiLnRyYW5zYWN0aW9uKFtcInJlc3RhdXJhbnRzXCJdKTtcclxuICAgICAgICB2YXIgaW5kZXggPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpLmluZGV4KFwibmVpZ2hib3Job29kLWN1aXNpbmVfdHlwZVwiKTtcclxuICAgICAgICB2YXIgcmVxdWVzdCA9IGluZGV4LmdldEFsbChbbmVpZ2hib3Job29kLCBjdWlzaW5lXSk7XHJcblxyXG4gICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QucmVzdWx0KTtcclxuXHJcbiAgICAgICAgICAvLyBSZXF1ZXN0IHRvIGFwaSB0byB1cGRhdGUgaW5kZXhlZERCXHJcbiAgICAgICAgICBEQkhlbHBlci5nZXRGcm9tQXBpKERCSGVscGVyLkRBVEFCQVNFX1VSTCArIGA/bmVpZ2hib3Job29kPSR7bmVpZ2hib3Job29kfSZjdWlzaW5lX3R5cGU9JHtjdWlzaW5lfWAsIGNhbGxiYWNrKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgY2FsbGJhY2soXCJFcnJvciBmZXRjaGluZyByZXN0YXVyYW50IGJ5IGN1aXNpbmUgYW5kIG5laWdoYm9yaG9vZFwiLCBudWxsKTtcclxuICAgICAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMICsgYD9uZWlnaGJvcmhvb2Q9JHtuZWlnaGJvcmhvb2R9JmN1aXNpbmVfdHlwZT0ke2N1aXNpbmV9YCwgY2FsbGJhY2spO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgREJIZWxwZXIuZ2V0RnJvbUFwaShEQkhlbHBlci5EQVRBQkFTRV9VUkwgKyBgP25laWdoYm9yaG9vZD0ke25laWdoYm9yaG9vZH0mY3Vpc2luZV90eXBlPSR7Y3Vpc2luZX1gLCBjYWxsYmFjayk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGFsbCBuZWlnaGJvcmhvb2RzIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaE5laWdoYm9yaG9vZHMoY2FsbGJhY2spIHtcclxuICAgIC8vIEZldGNoIGFsbCByZXN0YXVyYW50c1xyXG4gICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50cygoZXJyb3IsIHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBHZXQgYWxsIG5laWdoYm9yaG9vZHMgZnJvbSBhbGwgcmVzdGF1cmFudHNcclxuICAgICAgICBjb25zdCBuZWlnaGJvcmhvb2RzID0gcmVzdGF1cmFudHMubWFwKCh2LCBpKSA9PiByZXN0YXVyYW50c1tpXS5uZWlnaGJvcmhvb2QpO1xyXG4gICAgICAgIC8vIFJlbW92ZSBkdXBsaWNhdGVzIGZyb20gbmVpZ2hib3Job29kc1xyXG4gICAgICAgIGNvbnN0IHVuaXF1ZU5laWdoYm9yaG9vZHMgPSBuZWlnaGJvcmhvb2RzLmZpbHRlcigodiwgaSkgPT4gbmVpZ2hib3Job29kcy5pbmRleE9mKHYpID09IGkpO1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHVuaXF1ZU5laWdoYm9yaG9vZHMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGFsbCBjdWlzaW5lcyB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hDdWlzaW5lcyhjYWxsYmFjaykge1xyXG4gICAgLy8gRmV0Y2ggYWxsIHJlc3RhdXJhbnRzXHJcbiAgICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRzKChlcnJvciwgcmVzdGF1cmFudHMpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEdldCBhbGwgY3Vpc2luZXMgZnJvbSBhbGwgcmVzdGF1cmFudHNcclxuICAgICAgICBjb25zdCBjdWlzaW5lcyA9IHJlc3RhdXJhbnRzLm1hcCgodiwgaSkgPT4gcmVzdGF1cmFudHNbaV0uY3Vpc2luZV90eXBlKTtcclxuICAgICAgICAvLyBSZW1vdmUgZHVwbGljYXRlcyBmcm9tIGN1aXNpbmVzXHJcbiAgICAgICAgY29uc3QgdW5pcXVlQ3Vpc2luZXMgPSBjdWlzaW5lcy5maWx0ZXIoKHYsIGkpID0+IGN1aXNpbmVzLmluZGV4T2YodikgPT0gaSk7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgdW5pcXVlQ3Vpc2luZXMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlc3RhdXJhbnQgcGFnZSBVUkwuXHJcbiAgICovXHJcbiAgc3RhdGljIHVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCkge1xyXG4gICAgcmV0dXJuIChgLi9yZXN0YXVyYW50Lmh0bWw/aWQ9JHtyZXN0YXVyYW50LmlkfWApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVzdGF1cmFudCBpbWFnZSBVUkwuXHJcbiAgICovXHJcbiAgc3RhdGljIGltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSB7XHJcbiAgICByZXR1cm4gKGAvaW1nLyR7cmVzdGF1cmFudC5waG90b2dyYXBofS5qcGdgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIE1hcCBtYXJrZXIgZm9yIGEgcmVzdGF1cmFudC5cclxuICAgKi9cclxuICBzdGF0aWMgbWFwTWFya2VyRm9yUmVzdGF1cmFudChyZXN0YXVyYW50LCBtYXApIHtcclxuICAgIGNvbnN0IG1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xyXG4gICAgICBwb3NpdGlvbjogcmVzdGF1cmFudC5sYXRsbmcsXHJcbiAgICAgIHRpdGxlOiByZXN0YXVyYW50Lm5hbWUsXHJcbiAgICAgIHVybDogREJIZWxwZXIudXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSxcclxuICAgICAgbWFwOiBtYXAsXHJcbiAgICAgIGFuaW1hdGlvbjogZ29vZ2xlLm1hcHMuQW5pbWF0aW9uLkRST1BcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIG1hcmtlcjtcclxuICB9XHJcblxyXG59XHJcbiIsImxldCByZXN0YXVyYW50cyxcclxuICBuZWlnaGJvcmhvb2RzLFxyXG4gIGN1aXNpbmVzO1xyXG52YXIgbWFwO1xyXG52YXIgbWFya2VycyA9IFtdO1xyXG5cclxuLyoqXHJcbiAqIEZldGNoIG5laWdoYm9yaG9vZHMgYW5kIGN1aXNpbmVzIGFzIHNvb24gYXMgdGhlIHBhZ2UgaXMgbG9hZGVkLlxyXG4gKi9cclxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIChldmVudCkgPT4ge1xyXG5cclxuXHJcbiAgZmV0Y2hOZWlnaGJvcmhvb2RzKCk7XHJcbiAgZmV0Y2hDdWlzaW5lcygpO1xyXG5cclxufSk7XHJcblxyXG4vKipcclxuICogRmV0Y2ggYWxsIG5laWdoYm9yaG9vZHMgYW5kIHNldCB0aGVpciBIVE1MLlxyXG4gKi9cclxuZmV0Y2hOZWlnaGJvcmhvb2RzID0gKCkgPT4ge1xyXG4gIERCSGVscGVyLmZldGNoTmVpZ2hib3Job29kcygoZXJyb3IsIG5laWdoYm9yaG9vZHMpID0+IHtcclxuICAgIGlmIChlcnJvcikgeyAvLyBHb3QgYW4gZXJyb3JcclxuICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzZWxmLm5laWdoYm9yaG9vZHMgPSBuZWlnaGJvcmhvb2RzO1xyXG4gICAgICBmaWxsTmVpZ2hib3Job29kc0hUTUwoKTtcclxuICAgIH1cclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNldCBuZWlnaGJvcmhvb2RzIEhUTUwuXHJcbiAqL1xyXG5maWxsTmVpZ2hib3Job29kc0hUTUwgPSAobmVpZ2hib3Job29kcyA9IHNlbGYubmVpZ2hib3Job29kcykgPT4ge1xyXG4gIGNvbnN0IHNlbGVjdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCduZWlnaGJvcmhvb2RzLXNlbGVjdCcpO1xyXG4gIG5laWdoYm9yaG9vZHMuZm9yRWFjaChuZWlnaGJvcmhvb2QgPT4ge1xyXG4gICAgY29uc3Qgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7XHJcbiAgICBvcHRpb24uaW5uZXJIVE1MID0gbmVpZ2hib3Job29kO1xyXG4gICAgb3B0aW9uLnZhbHVlID0gbmVpZ2hib3Job29kO1xyXG4gICAgc2VsZWN0LmFwcGVuZChvcHRpb24pO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogRmV0Y2ggYWxsIGN1aXNpbmVzIGFuZCBzZXQgdGhlaXIgSFRNTC5cclxuICovXHJcbmZldGNoQ3Vpc2luZXMgPSAoKSA9PiB7XHJcbiAgREJIZWxwZXIuZmV0Y2hDdWlzaW5lcygoZXJyb3IsIGN1aXNpbmVzKSA9PiB7XHJcbiAgICBpZiAoZXJyb3IpIHsgLy8gR290IGFuIGVycm9yIVxyXG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHNlbGYuY3Vpc2luZXMgPSBjdWlzaW5lcztcclxuICAgICAgZmlsbEN1aXNpbmVzSFRNTCgpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogU2V0IGN1aXNpbmVzIEhUTUwuXHJcbiAqL1xyXG5maWxsQ3Vpc2luZXNIVE1MID0gKGN1aXNpbmVzID0gc2VsZi5jdWlzaW5lcykgPT4ge1xyXG4gIGNvbnN0IHNlbGVjdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjdWlzaW5lcy1zZWxlY3QnKTtcclxuXHJcbiAgY3Vpc2luZXMuZm9yRWFjaChjdWlzaW5lID0+IHtcclxuICAgIGNvbnN0IG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpO1xyXG4gICAgb3B0aW9uLmlubmVySFRNTCA9IGN1aXNpbmU7XHJcbiAgICBvcHRpb24udmFsdWUgPSBjdWlzaW5lO1xyXG4gICAgc2VsZWN0LmFwcGVuZChvcHRpb24pO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogSW5pdGlhbGl6ZSBHb29nbGUgbWFwLCBjYWxsZWQgZnJvbSBIVE1MLlxyXG4gKi9cclxud2luZG93LmluaXRNYXAgPSAoKSA9PiB7XHJcbiAgbGV0IGxvYyA9IHtcclxuICAgIGxhdDogNDAuNzIyMjE2LFxyXG4gICAgbG5nOiAtNzMuOTg3NTAxXHJcbiAgfTtcclxuICBzZWxmLm1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcCcpLCB7XHJcbiAgICB6b29tOiAxMixcclxuICAgIGNlbnRlcjogbG9jLFxyXG4gICAgc2Nyb2xsd2hlZWw6IGZhbHNlXHJcbiAgfSk7XHJcbiAgdmFyIGluZGV4ZWREQiA9IHdpbmRvdy5pbmRleGVkREIgfHwgd2luZG93Lm1vekluZGV4ZWREQiB8fCB3aW5kb3cud2Via2l0SW5kZXhlZERCIHx8IHdpbmRvdy5tc0luZGV4ZWREQiB8fCB3aW5kb3cuc2hpbUluZGV4ZWREQjtcclxuXHJcbiAgaWYgKCF3aW5kb3cuaW5kZXhlZERCKSB7XHJcbiAgICB3aW5kb3cuYWxlcnQoXCJTdSBuYXZlZ2Fkb3Igbm8gc29wb3J0YSB1bmEgdmVyc2nDs24gZXN0YWJsZSBkZSBpbmRleGVkREIuIFRhbCB5IGNvbW8gbGFzIGNhcmFjdGVyw61zdGljYXMgbm8gc2Vyw6FuIHZhbGlkYXNcIik7XHJcbiAgICB1cGRhdGVSZXN0YXVyYW50cygpO1xyXG4gIH1cclxuXHJcbiAgLy8gZGVqYW1vcyBhYmllcnRhIG51ZXN0cmEgYmFzZSBkZSBkYXRvc1xyXG4gIGxldCByZXF1ZXN0ID0gd2luZG93LmluZGV4ZWREQi5vcGVuKFwicmVzdGF1cmFudHMtanNvblwiLCAxKTtcclxuXHJcbiAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgIGFsZXJ0KFwiV2h5IGRpZG4ndCB5b3UgYWxsb3cgbXkgd2ViIGFwcCB0byB1c2UgSW5kZXhlZERCPyFcIik7XHJcbiAgfTtcclxuICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICBEQkhlbHBlci5kYiA9IHJlcXVlc3QucmVzdWx0O1xyXG5cclxuICAgIHVwZGF0ZVJlc3RhdXJhbnRzKCk7XHJcblxyXG4gICAgcmVnaXN0ZXJTVygpO1xyXG5cclxuICAgIERCSGVscGVyLmRiLm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAvLyBHZW5lcmljIGVycm9yIGhhbmRsZXIgZm9yIGFsbCBlcnJvcnMgdGFyZ2V0ZWQgYXQgdGhpcyBkYXRhYmFzZSdzXHJcbiAgICAgIC8vIHJlcXVlc3RzIVxyXG4gICAgICBhbGVydChcIkRhdGFiYXNlIGVycm9yOiBcIiArIGV2ZW50LnRhcmdldC5lcnJvckNvZGUpO1xyXG4gICAgfTtcclxuICB9O1xyXG5cclxuICAvLyBFc3RlIGV2ZW50byBzb2xhbWVudGUgZXN0w6EgaW1wbGVtZW50YWRvIGVuIG5hdmVnYWRvcmVzIHJlY2llbnRlc1xyXG4gIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgIHZhciBkYiA9IGV2ZW50LnRhcmdldC5yZXN1bHQ7XHJcblxyXG4gICAgLy8gU2UgY3JlYSB1biBhbG1hY8OpbiBwYXJhIGNvbnRlbmVyIGxhIGluZm9ybWFjacOzbiBkZSBudWVzdHJvcyBjbGllbnRlXHJcbiAgICAvLyBTZSB1c2Fyw6EgXCJzc25cIiBjb21vIGNsYXZlIHlhIHF1ZSBlcyBnYXJhbnRpemFkbyBxdWUgZXMgw7puaWNhXHJcbiAgICB2YXIgb2JqZWN0U3RvcmUgPSBkYi5jcmVhdGVPYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIsIHtcclxuICAgICAga2V5UGF0aDogXCJpZFwiXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZSBjcmVhIHVuIMOtbmRpY2UgcGFyYSBidXNjYXIgY2xpZW50ZXNwb3IgdmVjaW5kYXJpby4uXHJcbiAgICBvYmplY3RTdG9yZS5jcmVhdGVJbmRleChcIm5laWdoYm9yaG9vZFwiLCBcIm5laWdoYm9yaG9vZFwiLCB7XHJcbiAgICAgIHVuaXF1ZTogZmFsc2VcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNlIGNyZWEgdW4gaW5kaWNlIHBhcmEgYnVzY2FyIGNsaWVudGVzIHBvciB0aXBvIGRlIGNvY2luYVxyXG4gICAgb2JqZWN0U3RvcmUuY3JlYXRlSW5kZXgoXCJjdWlzaW5lX3R5cGVcIiwgXCJjdWlzaW5lX3R5cGVcIiwge1xyXG4gICAgICB1bmlxdWU6IGZhbHNlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZSBjcmVhIHVuIMOtbmRpY2UgcGFyYSBidXNjYXIgY2xpZW50ZXNwb3IgdmVjaW5kYXJpby4uXHJcbiAgICBvYmplY3RTdG9yZS5jcmVhdGVJbmRleChcIm5laWdoYm9yaG9vZC1jdWlzaW5lX3R5cGVcIiwgW1wibmVpZ2hib3Job29kXCIsIFwiY3Vpc2luZV90eXBlXCJdLCB7XHJcbiAgICAgIHVuaXF1ZTogZmFsc2VcclxuICAgIH0pO1xyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVcGRhdGUgcGFnZSBhbmQgbWFwIGZvciBjdXJyZW50IHJlc3RhdXJhbnRzLlxyXG4gKi9cclxudXBkYXRlUmVzdGF1cmFudHMgPSAoKSA9PiB7XHJcbiAgY29uc3QgY1NlbGVjdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjdWlzaW5lcy1zZWxlY3QnKTtcclxuICBjb25zdCBuU2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ25laWdoYm9yaG9vZHMtc2VsZWN0Jyk7XHJcblxyXG4gIGNvbnN0IGNJbmRleCA9IGNTZWxlY3Quc2VsZWN0ZWRJbmRleDtcclxuICBjb25zdCBuSW5kZXggPSBuU2VsZWN0LnNlbGVjdGVkSW5kZXg7XHJcblxyXG4gIGNvbnN0IGN1aXNpbmUgPSBjU2VsZWN0W2NJbmRleF0udmFsdWU7XHJcbiAgY29uc3QgbmVpZ2hib3Job29kID0gblNlbGVjdFtuSW5kZXhdLnZhbHVlO1xyXG5cclxuICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRCeUN1aXNpbmVBbmROZWlnaGJvcmhvb2QoY3Vpc2luZSwgbmVpZ2hib3Job29kLCAoZXJyb3IsIHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgICBpZiAoZXJyb3IpIHsgLy8gR290IGFuIGVycm9yIVxyXG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJlc2V0UmVzdGF1cmFudHMocmVzdGF1cmFudHMpO1xyXG4gICAgICBmaWxsUmVzdGF1cmFudHNIVE1MKCk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDbGVhciBjdXJyZW50IHJlc3RhdXJhbnRzLCB0aGVpciBIVE1MIGFuZCByZW1vdmUgdGhlaXIgbWFwIG1hcmtlcnMuXHJcbiAqL1xyXG5yZXNldFJlc3RhdXJhbnRzID0gKHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgLy8gUmVtb3ZlIGFsbCByZXN0YXVyYW50c1xyXG4gIHNlbGYucmVzdGF1cmFudHMgPSBbXTtcclxuICBjb25zdCB1bCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50cy1saXN0Jyk7XHJcbiAgdWwuaW5uZXJIVE1MID0gJyc7XHJcblxyXG4gIC8vIFJlbW92ZSBhbGwgbWFwIG1hcmtlcnNcclxuICBzZWxmLm1hcmtlcnMuZm9yRWFjaChtID0+IG0uc2V0TWFwKG51bGwpKTtcclxuICBzZWxmLm1hcmtlcnMgPSBbXTtcclxuICBzZWxmLnJlc3RhdXJhbnRzID0gcmVzdGF1cmFudHM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgYWxsIHJlc3RhdXJhbnRzIEhUTUwgYW5kIGFkZCB0aGVtIHRvIHRoZSB3ZWJwYWdlLlxyXG4gKi9cclxuZmlsbFJlc3RhdXJhbnRzSFRNTCA9IChyZXN0YXVyYW50cyA9IHNlbGYucmVzdGF1cmFudHMpID0+IHtcclxuICBjb25zdCB1bCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50cy1saXN0Jyk7XHJcblxyXG4gIHJlc3RhdXJhbnRzLmZvckVhY2gocmVzdGF1cmFudCA9PiB7XHJcbiAgICB1bC5hcHBlbmQoY3JlYXRlUmVzdGF1cmFudEhUTUwocmVzdGF1cmFudCkpO1xyXG4gIH0pO1xyXG4gIGFkZE1hcmtlcnNUb01hcCgpO1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIHJlc3RhdXJhbnQgSFRNTC5cclxuICovXHJcbmNyZWF0ZVJlc3RhdXJhbnRIVE1MID0gKHJlc3RhdXJhbnQpID0+IHtcclxuICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcblxyXG4gIGNvbnN0IGltYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XHJcbiAgaW1hZ2UuY2xhc3NOYW1lID0gJ3Jlc3RhdXJhbnQtaW1nJztcclxuICBpbWFnZS5zcmMgPSBEQkhlbHBlci5pbWFnZVVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCk7XHJcbiAgaW1hZ2UuYWx0ID0gcmVzdGF1cmFudC5uYW1lICsgJ1xcJ3MgaW1hZ2UnO1xyXG4gIGxpLmFwcGVuZChpbWFnZSk7XHJcblxyXG4gIGNvbnN0IG5hbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoMycpO1xyXG4gIG5hbWUuaW5uZXJIVE1MID0gcmVzdGF1cmFudC5uYW1lO1xyXG4gIGxpLmFwcGVuZChuYW1lKTtcclxuXHJcbiAgY29uc3QgbmVpZ2hib3Job29kID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gIG5laWdoYm9yaG9vZC5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5laWdoYm9yaG9vZDtcclxuICBsaS5hcHBlbmQobmVpZ2hib3Job29kKTtcclxuXHJcbiAgY29uc3QgYWRkcmVzcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcclxuICBhZGRyZXNzLmlubmVySFRNTCA9IHJlc3RhdXJhbnQuYWRkcmVzcztcclxuICBsaS5hcHBlbmQoYWRkcmVzcyk7XHJcblxyXG4gIGNvbnN0IG1vcmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XHJcbiAgbW9yZS5pbm5lckhUTUwgPSAnVmlldyBEZXRhaWxzJztcclxuICBtb3JlLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsIFwiQ2xpYyB0byB2aWV3IG1vcmUgaW5mb3JtYXRpb24gYW5kIHJldmlld3Mgb2YgXCIgKyByZXN0YXVyYW50Lm5hbWUpO1xyXG4gIG1vcmUuaHJlZiA9IERCSGVscGVyLnVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCk7XHJcbiAgbGkuYXBwZW5kKG1vcmUpO1xyXG5cclxuICBjb25zdCBmYXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XHJcbiAgZmF2LmlkID0gcmVzdGF1cmFudC5pZDtcclxuXHJcbiAgaWYgKCFyZXN0YXVyYW50LmlzX2Zhdm9yaXRlIHx8IHJlc3RhdXJhbnQuaXNfZmF2b3JpdGU9PT1cImZhbHNlXCIpe1xyXG4gICAgZmF2LmlubmVySFRNTCA9ICfimIYnO1xyXG4gIH1lbHNle1xyXG4gICAgZmF2LmlubmVySFRNTCA9ICfimIUnO1xyXG4gIH1cclxuXHJcblxyXG4gIGZhdi5jbGFzc05hbWU9XCJmYXZcIjtcclxuICBmYXYuaHJlZiA9IFwiI1wiO1xyXG5cclxuICBmYXYuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsZnVuY3Rpb24oZSl7XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgXHJcbiAgICB2YXIgdHJhbnNhY3Rpb24gPSBEQkhlbHBlci5kYi50cmFuc2FjdGlvbihbXCJyZXN0YXVyYW50c1wiXSwgXCJyZWFkd3JpdGVcIik7XHJcbiAgICB2YXIgb2JqZWN0U3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpO1xyXG4gICAgdmFyIGlkID0gcGFyc2VJbnQoZmF2LmlkKTtcclxuXHJcbiAgICBpZiAoZmF2LmlubmVySFRNTCA9PT0gJ+KYhScpe1xyXG4gICAgICBmYXYuaW5uZXJIVE1MID0gJ+KYhic7XHJcbiAgICAgIHJlc3RhdXJhbnQuaXNfZmF2b3JpdGUgPSBmYWxzZTtcclxuICAgICAgb2JqZWN0U3RvcmUucHV0KHJlc3RhdXJhbnQpO1xyXG5cclxuICAgIH1lbHNle1xyXG4gICAgICBmYXYuaW5uZXJIVE1MID0gJ+KYhSc7XHJcbiAgICAgIHJlc3RhdXJhbnQuaXNfZmF2b3JpdGUgPSB0cnVlO1xyXG4gICAgICBvYmplY3RTdG9yZS5wdXQocmVzdGF1cmFudCk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHdvcmtlciA9IG5ldyBXb3JrZXIoXCIuL2pzL3B1dFdvcmtlci5qc1wiKTtcclxuXHJcbiAgICB2YXIgbWVzc2FnZSA9IFtpZCwgcmVzdGF1cmFudC5pc19mYXZvcml0ZV07XHJcblxyXG4gICAgd29ya2VyLnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xyXG4gICAgXHJcbiAgfSk7XHJcblxyXG4gIG5hbWUuYXBwZW5kKGZhdik7XHJcblxyXG4gIHJldHVybiBsaTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFkZCBtYXJrZXJzIGZvciBjdXJyZW50IHJlc3RhdXJhbnRzIHRvIHRoZSBtYXAuXHJcbiAqL1xyXG5hZGRNYXJrZXJzVG9NYXAgPSAocmVzdGF1cmFudHMgPSBzZWxmLnJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgcmVzdGF1cmFudHMuZm9yRWFjaChyZXN0YXVyYW50ID0+IHtcclxuICAgIC8vIEFkZCBtYXJrZXIgdG8gdGhlIG1hcFxyXG4gICAgY29uc3QgbWFya2VyID0gREJIZWxwZXIubWFwTWFya2VyRm9yUmVzdGF1cmFudChyZXN0YXVyYW50LCBzZWxmLm1hcCk7XHJcbiAgICBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcihtYXJrZXIsICdjbGljaycsICgpID0+IHtcclxuICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBtYXJrZXIudXJsO1xyXG4gICAgfSk7XHJcbiAgICBzZWxmLm1hcmtlcnMucHVzaChtYXJrZXIpO1xyXG4gIH0pO1xyXG59IiwiZnVuY3Rpb24gcmVnaXN0ZXJTVygpIHsgICAgXHJcblxyXG4gICAgaWYgKG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyKSB7XHJcbiAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJ3N3LmpzJykudGhlbihmdW5jdGlvbiAocmVnKSB7XHJcbiAgICAgICAgICAgIGlmICghbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuY29udHJvbGxlcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocmVnLndhaXRpbmcpIHtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZVJlYWR5KHJlZy53YWl0aW5nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHJlZy5pbnN0YWxsaW5nKSB7XHJcbiAgICAgICAgICAgICAgICB0cmFja0luc3RhbGxpbmcocmVnLmluc3RhbGxpbmcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZWcuYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlZm91bmQnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB0cmFja0luc3RhbGxpbmcocmVnLmluc3RhbGxpbmcpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdmFyIHJlZnJlc2hpbmc7XHJcbiAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuYWRkRXZlbnRMaXN0ZW5lcignY29udHJvbGxlcmNoYW5nZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHJlZnJlc2hpbmcpIHJldHVybjtcclxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xyXG4gICAgICAgICAgICByZWZyZXNoaW5nID0gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgIH1cclxufVxyXG5cclxudXBkYXRlUmVhZHkgPSBmdW5jdGlvbiAod29ya2VyKSB7XHJcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UoeyBhY3Rpb246ICdza2lwV2FpdGluZycgfSk7XHJcbn07XHJcblxyXG50cmFja0luc3RhbGxpbmcgPSBmdW5jdGlvbiAod29ya2VyKSB7XHJcbiAgICB3b3JrZXIuYWRkRXZlbnRMaXN0ZW5lcignc3RhdGVjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKHdvcmtlci5zdGF0ZSA9PSAnaW5zdGFsbGVkJykge1xyXG4gICAgICAgICAgICB1cGRhdGVSZWFkeSh3b3JrZXIpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59OyJdfQ==
