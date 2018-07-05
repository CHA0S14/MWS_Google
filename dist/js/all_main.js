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

          if(request.result.lenght === 0)
            DBHelper.getFromApi(DBHelper.DATABASE_URL, callback);

          if(!request.result){
            callback(error,response);
          }
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRiaGVscGVyX21haW4uanMiLCJtYWluLmpzIiwic3dSZWdpc3Rlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWxsX21haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiogXHJcbiAqIENvbW1vbiBkYXRhYmFzZSBoZWxwZXIgZnVuY3Rpb25zLlxyXG4gKi9cclxuY2xhc3MgREJIZWxwZXIge1xyXG4gIC8qKlxyXG4gICAqIERhdGFiYXNlIFVSTC5cclxuICAgKiBDaGFuZ2UgdGhpcyB0byByZXN0YXVyYW50cy5qc29uIGZpbGUgbG9jYXRpb24gb24geW91ciBzZXJ2ZXIuXHJcbiAgICovXHJcbiAgc3RhdGljIGdldCBEQVRBQkFTRV9VUkwoKSB7XHJcbiAgICBjb25zdCBwb3J0ID0gMTMzNzsgLy8gQ2hhbmdlIHRoaXMgdG8geW91ciBzZXJ2ZXIgcG9ydFxyXG4gICAgcmV0dXJuIGBodHRwOi8vbG9jYWxob3N0OiR7cG9ydH0vcmVzdGF1cmFudHNgO1xyXG4gIH1cclxuICBzdGF0aWMgZ2V0IFJFVklFV19VUkwoKSB7XHJcbiAgICBjb25zdCBwb3J0ID0gMTMzNzsgLy8gQ2hhbmdlIHRoaXMgdG8geW91ciBzZXJ2ZXIgcG9ydFxyXG4gICAgcmV0dXJuIGBodHRwOi8vbG9jYWxob3N0OiR7cG9ydH0vcmV2aWV3cy8/cmVzdGF1cmFudF9pZD1gO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggYWxsIHJlc3RhdXJhbnRzLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRzKGNhbGxiYWNrKSB7XHJcbiAgICBpZiAoREJIZWxwZXIuZGIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB2YXIgdHJhbnNhY3Rpb24gPSBEQkhlbHBlci5kYi50cmFuc2FjdGlvbihbXCJyZXN0YXVyYW50c1wiXSk7XHJcbiAgICAgIHZhciBvYmplY3RTdG9yZSA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKFwicmVzdGF1cmFudHNcIik7XHJcbiAgICAgIHZhciByZXF1ZXN0ID0gb2JqZWN0U3RvcmUuZ2V0QWxsKCk7XHJcblxyXG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIGNhY2hlUmV2aWV3cyA9IHJlcXVlc3QucmVzdWx0O1xyXG5cclxuICAgICAgICB2YXIgcmVzdGF1cmFudERhdGEgPSBmZXRjaChEQkhlbHBlci5EQVRBQkFTRV9VUkwpXHJcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiByZXNwb25zZS5qc29uKCkpXHJcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcblxyXG5cclxuICAgICAgICAgIHZhciB3b3JrZXIgPSBuZXcgV29ya2VyKFwiLi9qcy91cGRhdGVyRmF2QXBpV29ya2VyLmpzXCIpO1xyXG4gICAgICAgICAgdmFyIG1lc3NhZ2UgPSBbY2FjaGVSZXZpZXdzLCByZXNwb25zZV07XHJcblxyXG4gICAgICAgICAgd29ya2VyLnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xyXG5cclxuICAgICAgICAgIGlmKHJlcXVlc3QucmVzdWx0LmxlbmdodCA9PT0gMClcclxuICAgICAgICAgICAgREJIZWxwZXIuZ2V0RnJvbUFwaShEQkhlbHBlci5EQVRBQkFTRV9VUkwsIGNhbGxiYWNrKTtcclxuXHJcbiAgICAgICAgICBpZighcmVxdWVzdC5yZXN1bHQpe1xyXG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvcixyZXNwb25zZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMLCBjYWxsYmFjayk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMLCBjYWxsYmFjayk7XHJcbiAgICB9XHJcblxyXG4gIH1cclxuXHJcbiAgc3RhdGljIGdldEZyb21BcGkodXJsLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHJlc3RhdXJhbnREYXRhID0gZmV0Y2godXJsKVxyXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcblxyXG4gICAgICAgIGlmIChEQkhlbHBlci5kYiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB2YXIgdHJhbnNhY3Rpb24gPSBEQkhlbHBlci5kYi50cmFuc2FjdGlvbihbXCJyZXN0YXVyYW50c1wiXSwgXCJyZWFkd3JpdGVcIik7XHJcbiAgICAgICAgICB2YXIgb2JqZWN0U3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpO1xyXG5cclxuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlc3BvbnNlKSkge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgcmVzcG9uc2VbaV0uaXNfZmF2b3JpdGUgPSByZXNwb25zZVtpXS5pc19mYXZvcml0ZSArIFwiXCI7XHJcbiAgICAgICAgICAgICAgdmFyIHJlcXVlc3QgPSBvYmplY3RTdG9yZS5wdXQocmVzcG9uc2VbaV0pO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb3VsZG50IGJlIGFkZGVkXCIpXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmVzcG9uc2UuaXNfZmF2b3JpdGUgPSByZXNwb25zZS5pc19mYXZvcml0ZSArIFwiXCI7XHJcbiAgICAgICAgICAgIHZhciByZXF1ZXN0ID0gb2JqZWN0U3RvcmUucHV0KHJlc3BvbnNlKTtcclxuXHJcbiAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvdWxkbnQgYmUgYWRkZWRcIilcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYWxsYmFjayhudWxsLCByZXNwb25zZSk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5jYXRjaCgoZSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGVycm9yID0gKGBSZXF1ZXN0IGZhaWxlZC4gJHtlfWApO1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCBhIHJlc3RhdXJhbnQgYnkgaXRzIElELlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRCeUlkKGlkLCBjYWxsYmFjaykge1xyXG4gICAgaWYgKERCSGVscGVyLmRiICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdmFyIHRyYW5zYWN0aW9uID0gREJIZWxwZXIuZGIudHJhbnNhY3Rpb24oW1wicmVzdGF1cmFudHNcIl0pO1xyXG4gICAgICB2YXIgb2JqZWN0U3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpO1xyXG4gICAgICB2YXIgcmVxdWVzdCA9IG9iamVjdFN0b3JlLmdldChpZCk7XHJcbiAgICAgIHZhciB1cmwgPSBEQkhlbHBlci5EQVRBQkFTRV9VUkwgKyBgLyR7aWR9YDtcclxuXHJcbiAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICBpZihyZXF1ZXN0LnJlc3VsdCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgIGNhbGxiYWNrKFwiTm8gcmVzdGF1cmFudCBmb3VuZFwiLCBudWxsKTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QucmVzdWx0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlcXVlc3QgdG8gYXBpIHRvIHVwZGF0ZSBpbmRleGVkREJcclxuICAgICAgICBEQkhlbHBlci5nZXRGcm9tQXBpKHVybCwgY2FsbGJhY2spO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAvLyBSZXF1ZXN0IHRvIGFwaSB0byB1cGRhdGUgaW5kZXhlZERCXHJcbiAgICAgICAgREJIZWxwZXIuZ2V0RnJvbUFwaSh1cmwsIGNhbGxiYWNrKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNle1xyXG4gICAgICAvLyBSZXF1ZXN0IHRvIGFwaSB0byB1cGRhdGUgaW5kZXhlZERCXHJcbiAgICAgIERCSGVscGVyLmdldEZyb21BcGkodXJsLCBjYWxsYmFjayk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCByZXN0YXVyYW50cyBieSBhIGN1aXNpbmUgdHlwZSB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50QnlDdWlzaW5lKGN1aXNpbmUsIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAoREJIZWxwZXIuZGIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB2YXIgdHJhbnNhY3Rpb24gPSBEQkhlbHBlci5kYi50cmFuc2FjdGlvbihbXCJyZXN0YXVyYW50c1wiXSk7XHJcbiAgICAgIHZhciBpbmRleCA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKFwicmVzdGF1cmFudHNcIikuaW5kZXgoXCJjdWlzaW5lX3R5cGVcIik7XHJcbiAgICAgIHZhciByZXF1ZXN0ID0gaW5kZXguZ2V0QWxsKGN1aXNpbmUpO1xyXG5cclxuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QucmVzdWx0KTtcclxuXHJcbiAgICAgICAgLy8gUmVxdWVzdCB0byBhcGkgdG8gdXBkYXRlIGluZGV4ZWREQlxyXG4gICAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMICsgYD9jdWlzaW5lX3R5cGU9JHtjdWlzaW5lfWAsIGNhbGxiYWNrKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgREJIZWxwZXIuZ2V0RnJvbUFwaShEQkhlbHBlci5EQVRBQkFTRV9VUkwgKyBgP2N1aXNpbmVfdHlwZT0ke2N1aXNpbmV9YCwgY2FsbGJhY2spO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBEQkhlbHBlci5nZXRGcm9tQXBpKERCSGVscGVyLkRBVEFCQVNFX1VSTCArIGA/Y3Vpc2luZV90eXBlPSR7Y3Vpc2luZX1gLCBjYWxsYmFjayk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCByZXN0YXVyYW50cyBieSBhIG5laWdoYm9yaG9vZCB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50QnlOZWlnaGJvcmhvb2QobmVpZ2hib3Job29kLCBjYWxsYmFjaykge1xyXG4gICAgaWYgKERCSGVscGVyLmRiICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdmFyIHRyYW5zYWN0aW9uID0gREJIZWxwZXIuZGIudHJhbnNhY3Rpb24oW1wicmVzdGF1cmFudHNcIl0pO1xyXG4gICAgICB2YXIgaW5kZXggPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpLmluZGV4KFwibmVpZ2hib3Job29kXCIpO1xyXG4gICAgICB2YXIgcmVxdWVzdCA9IGluZGV4LmdldEFsbChuZWlnaGJvcmhvb2QpO1xyXG5cclxuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QucmVzdWx0KTtcclxuXHJcbiAgICAgICAgLy8gUmVxdWVzdCB0byBhcGkgdG8gdXBkYXRlIGluZGV4ZWREQlxyXG4gICAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMICsgYD9uZWlnaGJvcmhvb2Q9JHtuZWlnaGJvcmhvb2R9YCwgY2FsbGJhY2spO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICBEQkhlbHBlci5nZXRGcm9tQXBpKERCSGVscGVyLkRBVEFCQVNFX1VSTCArIGA/bmVpZ2hib3Job29kPSR7bmVpZ2hib3Job29kfWAsIGNhbGxiYWNrKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgREJIZWxwZXIuZ2V0RnJvbUFwaShEQkhlbHBlci5EQVRBQkFTRV9VUkwgKyBgP25laWdoYm9yaG9vZD0ke25laWdoYm9yaG9vZH1gLCBjYWxsYmFjayk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCByZXN0YXVyYW50cyBieSBhIGN1aXNpbmUgYW5kIGEgbmVpZ2hib3Job29kIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRCeUN1aXNpbmVBbmROZWlnaGJvcmhvb2QoY3Vpc2luZSwgbmVpZ2hib3Job29kLCBjYWxsYmFjaykge1xyXG5cclxuICAgIGlmIChuZWlnaGJvcmhvb2QgPT09ICdhbGwnICYmIGN1aXNpbmUgPT09ICdhbGwnKSB7XHJcbiAgICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudHMoY2FsbGJhY2spO1xyXG4gICAgfSBlbHNlIGlmIChuZWlnaGJvcmhvb2QgIT09ICdhbGwnICYmIGN1aXNpbmUgPT09ICdhbGwnKSB7XHJcbiAgICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudEJ5TmVpZ2hib3Job29kKG5laWdoYm9yaG9vZCwgY2FsbGJhY2spO1xyXG4gICAgfSBlbHNlIGlmIChuZWlnaGJvcmhvb2QgPT09ICdhbGwnICYmIGN1aXNpbmUgIT09ICdhbGwnKSB7XHJcbiAgICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudEJ5Q3Vpc2luZShjdWlzaW5lLCBjYWxsYmFjayk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpZiAoREJIZWxwZXIuZGIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHZhciB0cmFuc2FjdGlvbiA9IERCSGVscGVyLmRiLnRyYW5zYWN0aW9uKFtcInJlc3RhdXJhbnRzXCJdKTtcclxuICAgICAgICB2YXIgaW5kZXggPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpLmluZGV4KFwibmVpZ2hib3Job29kLWN1aXNpbmVfdHlwZVwiKTtcclxuICAgICAgICB2YXIgcmVxdWVzdCA9IGluZGV4LmdldEFsbChbbmVpZ2hib3Job29kLCBjdWlzaW5lXSk7XHJcblxyXG4gICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QucmVzdWx0KTtcclxuXHJcbiAgICAgICAgICAvLyBSZXF1ZXN0IHRvIGFwaSB0byB1cGRhdGUgaW5kZXhlZERCXHJcbiAgICAgICAgICBEQkhlbHBlci5nZXRGcm9tQXBpKERCSGVscGVyLkRBVEFCQVNFX1VSTCArIGA/bmVpZ2hib3Job29kPSR7bmVpZ2hib3Job29kfSZjdWlzaW5lX3R5cGU9JHtjdWlzaW5lfWAsIGNhbGxiYWNrKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgY2FsbGJhY2soXCJFcnJvciBmZXRjaGluZyByZXN0YXVyYW50IGJ5IGN1aXNpbmUgYW5kIG5laWdoYm9yaG9vZFwiLCBudWxsKTtcclxuICAgICAgICAgIERCSGVscGVyLmdldEZyb21BcGkoREJIZWxwZXIuREFUQUJBU0VfVVJMICsgYD9uZWlnaGJvcmhvb2Q9JHtuZWlnaGJvcmhvb2R9JmN1aXNpbmVfdHlwZT0ke2N1aXNpbmV9YCwgY2FsbGJhY2spO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgREJIZWxwZXIuZ2V0RnJvbUFwaShEQkhlbHBlci5EQVRBQkFTRV9VUkwgKyBgP25laWdoYm9yaG9vZD0ke25laWdoYm9yaG9vZH0mY3Vpc2luZV90eXBlPSR7Y3Vpc2luZX1gLCBjYWxsYmFjayk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGFsbCBuZWlnaGJvcmhvb2RzIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaE5laWdoYm9yaG9vZHMoY2FsbGJhY2spIHtcclxuICAgIC8vIEZldGNoIGFsbCByZXN0YXVyYW50c1xyXG4gICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50cygoZXJyb3IsIHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBHZXQgYWxsIG5laWdoYm9yaG9vZHMgZnJvbSBhbGwgcmVzdGF1cmFudHNcclxuICAgICAgICBjb25zdCBuZWlnaGJvcmhvb2RzID0gcmVzdGF1cmFudHMubWFwKCh2LCBpKSA9PiByZXN0YXVyYW50c1tpXS5uZWlnaGJvcmhvb2QpO1xyXG4gICAgICAgIC8vIFJlbW92ZSBkdXBsaWNhdGVzIGZyb20gbmVpZ2hib3Job29kc1xyXG4gICAgICAgIGNvbnN0IHVuaXF1ZU5laWdoYm9yaG9vZHMgPSBuZWlnaGJvcmhvb2RzLmZpbHRlcigodiwgaSkgPT4gbmVpZ2hib3Job29kcy5pbmRleE9mKHYpID09IGkpO1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHVuaXF1ZU5laWdoYm9yaG9vZHMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGFsbCBjdWlzaW5lcyB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hDdWlzaW5lcyhjYWxsYmFjaykge1xyXG4gICAgLy8gRmV0Y2ggYWxsIHJlc3RhdXJhbnRzXHJcbiAgICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRzKChlcnJvciwgcmVzdGF1cmFudHMpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEdldCBhbGwgY3Vpc2luZXMgZnJvbSBhbGwgcmVzdGF1cmFudHNcclxuICAgICAgICBjb25zdCBjdWlzaW5lcyA9IHJlc3RhdXJhbnRzLm1hcCgodiwgaSkgPT4gcmVzdGF1cmFudHNbaV0uY3Vpc2luZV90eXBlKTtcclxuICAgICAgICAvLyBSZW1vdmUgZHVwbGljYXRlcyBmcm9tIGN1aXNpbmVzXHJcbiAgICAgICAgY29uc3QgdW5pcXVlQ3Vpc2luZXMgPSBjdWlzaW5lcy5maWx0ZXIoKHYsIGkpID0+IGN1aXNpbmVzLmluZGV4T2YodikgPT0gaSk7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgdW5pcXVlQ3Vpc2luZXMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlc3RhdXJhbnQgcGFnZSBVUkwuXHJcbiAgICovXHJcbiAgc3RhdGljIHVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCkge1xyXG4gICAgcmV0dXJuIChgLi9yZXN0YXVyYW50Lmh0bWw/aWQ9JHtyZXN0YXVyYW50LmlkfWApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVzdGF1cmFudCBpbWFnZSBVUkwuXHJcbiAgICovXHJcbiAgc3RhdGljIGltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSB7XHJcbiAgICByZXR1cm4gKGAvaW1nLyR7cmVzdGF1cmFudC5waG90b2dyYXBofS5qcGdgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIE1hcCBtYXJrZXIgZm9yIGEgcmVzdGF1cmFudC5cclxuICAgKi9cclxuICBzdGF0aWMgbWFwTWFya2VyRm9yUmVzdGF1cmFudChyZXN0YXVyYW50LCBtYXApIHtcclxuICAgIGNvbnN0IG1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xyXG4gICAgICBwb3NpdGlvbjogcmVzdGF1cmFudC5sYXRsbmcsXHJcbiAgICAgIHRpdGxlOiByZXN0YXVyYW50Lm5hbWUsXHJcbiAgICAgIHVybDogREJIZWxwZXIudXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSxcclxuICAgICAgbWFwOiBtYXAsXHJcbiAgICAgIGFuaW1hdGlvbjogZ29vZ2xlLm1hcHMuQW5pbWF0aW9uLkRST1BcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIG1hcmtlcjtcclxuICB9XHJcblxyXG59IiwibGV0IHJlc3RhdXJhbnRzLFxyXG4gIG5laWdoYm9yaG9vZHMsXHJcbiAgY3Vpc2luZXM7XHJcbnZhciBtYXA7XHJcbnZhciBtYXJrZXJzID0gW107XHJcblxyXG4vKipcclxuICogRmV0Y2ggbmVpZ2hib3Job29kcyBhbmQgY3Vpc2luZXMgYXMgc29vbiBhcyB0aGUgcGFnZSBpcyBsb2FkZWQuXHJcbiAqL1xyXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKGV2ZW50KSA9PiB7XHJcblxyXG5cclxuICBmZXRjaE5laWdoYm9yaG9vZHMoKTtcclxuICBmZXRjaEN1aXNpbmVzKCk7XHJcblxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBGZXRjaCBhbGwgbmVpZ2hib3Job29kcyBhbmQgc2V0IHRoZWlyIEhUTUwuXHJcbiAqL1xyXG5mZXRjaE5laWdoYm9yaG9vZHMgPSAoKSA9PiB7XHJcbiAgREJIZWxwZXIuZmV0Y2hOZWlnaGJvcmhvb2RzKChlcnJvciwgbmVpZ2hib3Job29kcykgPT4ge1xyXG4gICAgaWYgKGVycm9yKSB7IC8vIEdvdCBhbiBlcnJvclxyXG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHNlbGYubmVpZ2hib3Job29kcyA9IG5laWdoYm9yaG9vZHM7XHJcbiAgICAgIGZpbGxOZWlnaGJvcmhvb2RzSFRNTCgpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogU2V0IG5laWdoYm9yaG9vZHMgSFRNTC5cclxuICovXHJcbmZpbGxOZWlnaGJvcmhvb2RzSFRNTCA9IChuZWlnaGJvcmhvb2RzID0gc2VsZi5uZWlnaGJvcmhvb2RzKSA9PiB7XHJcbiAgY29uc3Qgc2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ25laWdoYm9yaG9vZHMtc2VsZWN0Jyk7XHJcbiAgbmVpZ2hib3Job29kcy5mb3JFYWNoKG5laWdoYm9yaG9vZCA9PiB7XHJcbiAgICBjb25zdCBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcclxuICAgIG9wdGlvbi5pbm5lckhUTUwgPSBuZWlnaGJvcmhvb2Q7XHJcbiAgICBvcHRpb24udmFsdWUgPSBuZWlnaGJvcmhvb2Q7XHJcbiAgICBzZWxlY3QuYXBwZW5kKG9wdGlvbik7XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGZXRjaCBhbGwgY3Vpc2luZXMgYW5kIHNldCB0aGVpciBIVE1MLlxyXG4gKi9cclxuZmV0Y2hDdWlzaW5lcyA9ICgpID0+IHtcclxuICBEQkhlbHBlci5mZXRjaEN1aXNpbmVzKChlcnJvciwgY3Vpc2luZXMpID0+IHtcclxuICAgIGlmIChlcnJvcikgeyAvLyBHb3QgYW4gZXJyb3IhXHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2VsZi5jdWlzaW5lcyA9IGN1aXNpbmVzO1xyXG4gICAgICBmaWxsQ3Vpc2luZXNIVE1MKCk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZXQgY3Vpc2luZXMgSFRNTC5cclxuICovXHJcbmZpbGxDdWlzaW5lc0hUTUwgPSAoY3Vpc2luZXMgPSBzZWxmLmN1aXNpbmVzKSA9PiB7XHJcbiAgY29uc3Qgc2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2N1aXNpbmVzLXNlbGVjdCcpO1xyXG5cclxuICBjdWlzaW5lcy5mb3JFYWNoKGN1aXNpbmUgPT4ge1xyXG4gICAgY29uc3Qgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7XHJcbiAgICBvcHRpb24uaW5uZXJIVE1MID0gY3Vpc2luZTtcclxuICAgIG9wdGlvbi52YWx1ZSA9IGN1aXNpbmU7XHJcbiAgICBzZWxlY3QuYXBwZW5kKG9wdGlvbik7XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBJbml0aWFsaXplIEdvb2dsZSBtYXAsIGNhbGxlZCBmcm9tIEhUTUwuXHJcbiAqL1xyXG53aW5kb3cuaW5pdE1hcCA9ICgpID0+IHtcclxuICBsZXQgbG9jID0ge1xyXG4gICAgbGF0OiA0MC43MjIyMTYsXHJcbiAgICBsbmc6IC03My45ODc1MDFcclxuICB9O1xyXG4gIHNlbGYubWFwID0gbmV3IGdvb2dsZS5tYXBzLk1hcChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwJyksIHtcclxuICAgIHpvb206IDEyLFxyXG4gICAgY2VudGVyOiBsb2MsXHJcbiAgICBzY3JvbGx3aGVlbDogZmFsc2VcclxuICB9KTtcclxuICB2YXIgaW5kZXhlZERCID0gd2luZG93LmluZGV4ZWREQiB8fCB3aW5kb3cubW96SW5kZXhlZERCIHx8IHdpbmRvdy53ZWJraXRJbmRleGVkREIgfHwgd2luZG93Lm1zSW5kZXhlZERCIHx8IHdpbmRvdy5zaGltSW5kZXhlZERCO1xyXG5cclxuICBpZiAoIXdpbmRvdy5pbmRleGVkREIpIHtcclxuICAgIHdpbmRvdy5hbGVydChcIlN1IG5hdmVnYWRvciBubyBzb3BvcnRhIHVuYSB2ZXJzacOzbiBlc3RhYmxlIGRlIGluZGV4ZWREQi4gVGFsIHkgY29tbyBsYXMgY2FyYWN0ZXLDrXN0aWNhcyBubyBzZXLDoW4gdmFsaWRhc1wiKTtcclxuICAgIHVwZGF0ZVJlc3RhdXJhbnRzKCk7XHJcbiAgfVxyXG5cclxuICAvLyBkZWphbW9zIGFiaWVydGEgbnVlc3RyYSBiYXNlIGRlIGRhdG9zXHJcbiAgbGV0IHJlcXVlc3QgPSB3aW5kb3cuaW5kZXhlZERCLm9wZW4oXCJyZXN0YXVyYW50cy1qc29uXCIsIDEpO1xyXG5cclxuICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgYWxlcnQoXCJXaHkgZGlkbid0IHlvdSBhbGxvdyBteSB3ZWIgYXBwIHRvIHVzZSBJbmRleGVkREI/IVwiKTtcclxuICB9O1xyXG4gIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgIERCSGVscGVyLmRiID0gcmVxdWVzdC5yZXN1bHQ7XHJcblxyXG4gICAgdXBkYXRlUmVzdGF1cmFudHMoKTtcclxuXHJcbiAgICByZWdpc3RlclNXKCk7XHJcblxyXG4gICAgREJIZWxwZXIuZGIub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgIC8vIEdlbmVyaWMgZXJyb3IgaGFuZGxlciBmb3IgYWxsIGVycm9ycyB0YXJnZXRlZCBhdCB0aGlzIGRhdGFiYXNlJ3NcclxuICAgICAgLy8gcmVxdWVzdHMhXHJcbiAgICAgIGFsZXJ0KFwiRGF0YWJhc2UgZXJyb3I6IFwiICsgZXZlbnQudGFyZ2V0LmVycm9yQ29kZSk7XHJcbiAgICB9O1xyXG4gIH07XHJcblxyXG4gIC8vIEVzdGUgZXZlbnRvIHNvbGFtZW50ZSBlc3TDoSBpbXBsZW1lbnRhZG8gZW4gbmF2ZWdhZG9yZXMgcmVjaWVudGVzXHJcbiAgcmVxdWVzdC5vbnVwZ3JhZGVuZWVkZWQgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgdmFyIGRiID0gZXZlbnQudGFyZ2V0LnJlc3VsdDtcclxuXHJcbiAgICAvLyBTZSBjcmVhIHVuIGFsbWFjw6luIHBhcmEgY29udGVuZXIgbGEgaW5mb3JtYWNpw7NuIGRlIG51ZXN0cm9zIGNsaWVudGVcclxuICAgIC8vIFNlIHVzYXLDoSBcInNzblwiIGNvbW8gY2xhdmUgeWEgcXVlIGVzIGdhcmFudGl6YWRvIHF1ZSBlcyDDum5pY2FcclxuICAgIHZhciBvYmplY3RTdG9yZSA9IGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwicmVzdGF1cmFudHNcIiwge1xyXG4gICAgICBrZXlQYXRoOiBcImlkXCJcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNlIGNyZWEgdW4gw61uZGljZSBwYXJhIGJ1c2NhciBjbGllbnRlc3BvciB2ZWNpbmRhcmlvLi5cclxuICAgIG9iamVjdFN0b3JlLmNyZWF0ZUluZGV4KFwibmVpZ2hib3Job29kXCIsIFwibmVpZ2hib3Job29kXCIsIHtcclxuICAgICAgdW5pcXVlOiBmYWxzZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2UgY3JlYSB1biBpbmRpY2UgcGFyYSBidXNjYXIgY2xpZW50ZXMgcG9yIHRpcG8gZGUgY29jaW5hXHJcbiAgICBvYmplY3RTdG9yZS5jcmVhdGVJbmRleChcImN1aXNpbmVfdHlwZVwiLCBcImN1aXNpbmVfdHlwZVwiLCB7XHJcbiAgICAgIHVuaXF1ZTogZmFsc2VcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNlIGNyZWEgdW4gw61uZGljZSBwYXJhIGJ1c2NhciBjbGllbnRlc3BvciB2ZWNpbmRhcmlvLi5cclxuICAgIG9iamVjdFN0b3JlLmNyZWF0ZUluZGV4KFwibmVpZ2hib3Job29kLWN1aXNpbmVfdHlwZVwiLCBbXCJuZWlnaGJvcmhvb2RcIiwgXCJjdWlzaW5lX3R5cGVcIl0sIHtcclxuICAgICAgdW5pcXVlOiBmYWxzZVxyXG4gICAgfSk7XHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFVwZGF0ZSBwYWdlIGFuZCBtYXAgZm9yIGN1cnJlbnQgcmVzdGF1cmFudHMuXHJcbiAqL1xyXG51cGRhdGVSZXN0YXVyYW50cyA9ICgpID0+IHtcclxuICBjb25zdCBjU2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2N1aXNpbmVzLXNlbGVjdCcpO1xyXG4gIGNvbnN0IG5TZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbmVpZ2hib3Job29kcy1zZWxlY3QnKTtcclxuXHJcbiAgY29uc3QgY0luZGV4ID0gY1NlbGVjdC5zZWxlY3RlZEluZGV4O1xyXG4gIGNvbnN0IG5JbmRleCA9IG5TZWxlY3Quc2VsZWN0ZWRJbmRleDtcclxuXHJcbiAgY29uc3QgY3Vpc2luZSA9IGNTZWxlY3RbY0luZGV4XS52YWx1ZTtcclxuICBjb25zdCBuZWlnaGJvcmhvb2QgPSBuU2VsZWN0W25JbmRleF0udmFsdWU7XHJcblxyXG4gIERCSGVscGVyLmZldGNoUmVzdGF1cmFudEJ5Q3Vpc2luZUFuZE5laWdoYm9yaG9vZChjdWlzaW5lLCBuZWlnaGJvcmhvb2QsIChlcnJvciwgcmVzdGF1cmFudHMpID0+IHtcclxuICAgIGlmIChlcnJvcikgeyAvLyBHb3QgYW4gZXJyb3IhXHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmVzZXRSZXN0YXVyYW50cyhyZXN0YXVyYW50cyk7XHJcbiAgICAgIGZpbGxSZXN0YXVyYW50c0hUTUwoKTtcclxuICAgIH1cclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENsZWFyIGN1cnJlbnQgcmVzdGF1cmFudHMsIHRoZWlyIEhUTUwgYW5kIHJlbW92ZSB0aGVpciBtYXAgbWFya2Vycy5cclxuICovXHJcbnJlc2V0UmVzdGF1cmFudHMgPSAocmVzdGF1cmFudHMpID0+IHtcclxuICAvLyBSZW1vdmUgYWxsIHJlc3RhdXJhbnRzXHJcbiAgc2VsZi5yZXN0YXVyYW50cyA9IFtdO1xyXG4gIGNvbnN0IHVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnRzLWxpc3QnKTtcclxuICB1bC5pbm5lckhUTUwgPSAnJztcclxuXHJcbiAgLy8gUmVtb3ZlIGFsbCBtYXAgbWFya2Vyc1xyXG4gIHNlbGYubWFya2Vycy5mb3JFYWNoKG0gPT4gbS5zZXRNYXAobnVsbCkpO1xyXG4gIHNlbGYubWFya2VycyA9IFtdO1xyXG4gIHNlbGYucmVzdGF1cmFudHMgPSByZXN0YXVyYW50cztcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBhbGwgcmVzdGF1cmFudHMgSFRNTCBhbmQgYWRkIHRoZW0gdG8gdGhlIHdlYnBhZ2UuXHJcbiAqL1xyXG5maWxsUmVzdGF1cmFudHNIVE1MID0gKHJlc3RhdXJhbnRzID0gc2VsZi5yZXN0YXVyYW50cykgPT4ge1xyXG4gIGNvbnN0IHVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnRzLWxpc3QnKTtcclxuXHJcbiAgcmVzdGF1cmFudHMuZm9yRWFjaChyZXN0YXVyYW50ID0+IHtcclxuICAgIHVsLmFwcGVuZChjcmVhdGVSZXN0YXVyYW50SFRNTChyZXN0YXVyYW50KSk7XHJcbiAgfSk7XHJcbiAgYWRkTWFya2Vyc1RvTWFwKCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgcmVzdGF1cmFudCBIVE1MLlxyXG4gKi9cclxuY3JlYXRlUmVzdGF1cmFudEhUTUwgPSAocmVzdGF1cmFudCkgPT4ge1xyXG4gIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuXHJcbiAgY29uc3QgaW1hZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcclxuICBpbWFnZS5jbGFzc05hbWUgPSAncmVzdGF1cmFudC1pbWcnO1xyXG4gIGltYWdlLnNyYyA9IERCSGVscGVyLmltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KTtcclxuICBpbWFnZS5hbHQgPSByZXN0YXVyYW50Lm5hbWUgKyAnXFwncyBpbWFnZSc7XHJcbiAgbGkuYXBwZW5kKGltYWdlKTtcclxuXHJcbiAgY29uc3QgbmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2gzJyk7XHJcbiAgbmFtZS5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5hbWU7XHJcbiAgbGkuYXBwZW5kKG5hbWUpO1xyXG5cclxuICBjb25zdCBuZWlnaGJvcmhvb2QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XHJcbiAgbmVpZ2hib3Job29kLmlubmVySFRNTCA9IHJlc3RhdXJhbnQubmVpZ2hib3Job29kO1xyXG4gIGxpLmFwcGVuZChuZWlnaGJvcmhvb2QpO1xyXG5cclxuICBjb25zdCBhZGRyZXNzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gIGFkZHJlc3MuaW5uZXJIVE1MID0gcmVzdGF1cmFudC5hZGRyZXNzO1xyXG4gIGxpLmFwcGVuZChhZGRyZXNzKTtcclxuXHJcbiAgY29uc3QgbW9yZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcclxuICBtb3JlLmlubmVySFRNTCA9ICdWaWV3IERldGFpbHMnO1xyXG4gIG1vcmUuc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgXCJDbGljIHRvIHZpZXcgbW9yZSBpbmZvcm1hdGlvbiBhbmQgcmV2aWV3cyBvZiBcIiArIHJlc3RhdXJhbnQubmFtZSk7XHJcbiAgbW9yZS5ocmVmID0gREJIZWxwZXIudXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KTtcclxuICBsaS5hcHBlbmQobW9yZSk7XHJcblxyXG4gIGNvbnN0IGZhdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcclxuICBmYXYuaWQgPSByZXN0YXVyYW50LmlkO1xyXG5cclxuICBpZiAoIXJlc3RhdXJhbnQuaXNfZmF2b3JpdGUgfHwgcmVzdGF1cmFudC5pc19mYXZvcml0ZT09PVwiZmFsc2VcIil7XHJcbiAgICBmYXYuaW5uZXJIVE1MID0gJ+KYhic7XHJcbiAgfWVsc2V7XHJcbiAgICBmYXYuaW5uZXJIVE1MID0gJ+KYhSc7XHJcbiAgfVxyXG5cclxuXHJcbiAgZmF2LmNsYXNzTmFtZT1cImZhdlwiO1xyXG4gIGZhdi5ocmVmID0gXCIjXCI7XHJcblxyXG4gIGZhdi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIixmdW5jdGlvbihlKXtcclxuICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICBcclxuICAgIHZhciB0cmFuc2FjdGlvbiA9IERCSGVscGVyLmRiLnRyYW5zYWN0aW9uKFtcInJlc3RhdXJhbnRzXCJdLCBcInJlYWR3cml0ZVwiKTtcclxuICAgIHZhciBvYmplY3RTdG9yZSA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKFwicmVzdGF1cmFudHNcIik7XHJcbiAgICB2YXIgaWQgPSBwYXJzZUludChmYXYuaWQpO1xyXG5cclxuICAgIGlmIChmYXYuaW5uZXJIVE1MID09PSAn4piFJyl7XHJcbiAgICAgIGZhdi5pbm5lckhUTUwgPSAn4piGJztcclxuICAgICAgcmVzdGF1cmFudC5pc19mYXZvcml0ZSA9IGZhbHNlO1xyXG4gICAgICBvYmplY3RTdG9yZS5wdXQocmVzdGF1cmFudCk7XHJcblxyXG4gICAgfWVsc2V7XHJcbiAgICAgIGZhdi5pbm5lckhUTUwgPSAn4piFJztcclxuICAgICAgcmVzdGF1cmFudC5pc19mYXZvcml0ZSA9IHRydWU7XHJcbiAgICAgIG9iamVjdFN0b3JlLnB1dChyZXN0YXVyYW50KTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgd29ya2VyID0gbmV3IFdvcmtlcihcIi4vanMvcHV0V29ya2VyLmpzXCIpO1xyXG5cclxuICAgIHZhciBtZXNzYWdlID0gW2lkLCByZXN0YXVyYW50LmlzX2Zhdm9yaXRlXTtcclxuXHJcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UobWVzc2FnZSk7XHJcbiAgICBcclxuICB9KTtcclxuXHJcbiAgbmFtZS5hcHBlbmQoZmF2KTtcclxuXHJcbiAgcmV0dXJuIGxpO1xyXG59XHJcblxyXG4vKipcclxuICogQWRkIG1hcmtlcnMgZm9yIGN1cnJlbnQgcmVzdGF1cmFudHMgdG8gdGhlIG1hcC5cclxuICovXHJcbmFkZE1hcmtlcnNUb01hcCA9IChyZXN0YXVyYW50cyA9IHNlbGYucmVzdGF1cmFudHMpID0+IHtcclxuICByZXN0YXVyYW50cy5mb3JFYWNoKHJlc3RhdXJhbnQgPT4ge1xyXG4gICAgLy8gQWRkIG1hcmtlciB0byB0aGUgbWFwXHJcbiAgICBjb25zdCBtYXJrZXIgPSBEQkhlbHBlci5tYXBNYXJrZXJGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQsIHNlbGYubWFwKTtcclxuICAgIGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKG1hcmtlciwgJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IG1hcmtlci51cmw7XHJcbiAgICB9KTtcclxuICAgIHNlbGYubWFya2Vycy5wdXNoKG1hcmtlcik7XHJcbiAgfSk7XHJcbn0iLCJmdW5jdGlvbiByZWdpc3RlclNXKCkgeyAgICBcclxuXHJcbiAgICBpZiAobmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIpIHtcclxuICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3Rlcignc3cuanMnKS50aGVuKGZ1bmN0aW9uIChyZWcpIHtcclxuICAgICAgICAgICAgaWYgKCFuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5jb250cm9sbGVyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChyZWcud2FpdGluZykge1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlUmVhZHkocmVnLndhaXRpbmcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocmVnLmluc3RhbGxpbmcpIHtcclxuICAgICAgICAgICAgICAgIHRyYWNrSW5zdGFsbGluZyhyZWcuaW5zdGFsbGluZyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJlZy5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVmb3VuZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHRyYWNrSW5zdGFsbGluZyhyZWcuaW5zdGFsbGluZyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB2YXIgcmVmcmVzaGluZztcclxuICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5hZGRFdmVudExpc3RlbmVyKCdjb250cm9sbGVyY2hhbmdlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAocmVmcmVzaGluZykgcmV0dXJuO1xyXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XHJcbiAgICAgICAgICAgIHJlZnJlc2hpbmcgPSB0cnVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG59XHJcblxyXG51cGRhdGVSZWFkeSA9IGZ1bmN0aW9uICh3b3JrZXIpIHtcclxuICAgIHdvcmtlci5wb3N0TWVzc2FnZSh7IGFjdGlvbjogJ3NraXBXYWl0aW5nJyB9KTtcclxufTtcclxuXHJcbnRyYWNrSW5zdGFsbGluZyA9IGZ1bmN0aW9uICh3b3JrZXIpIHtcclxuICAgIHdvcmtlci5hZGRFdmVudExpc3RlbmVyKCdzdGF0ZWNoYW5nZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAod29ya2VyLnN0YXRlID09ICdpbnN0YWxsZWQnKSB7XHJcbiAgICAgICAgICAgIHVwZGF0ZVJlYWR5KHdvcmtlcik7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn07Il19
