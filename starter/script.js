'use strict';



const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10); ///we actually need other libraries to create a unique id but here we are using the current date to duplicate it
    //clicks = 0;

    constructor(coords, distance, duration){

        this.coords = coords; ///[lat, lng]
        this.distance = distance; // in km
        this.duration = duration; // in min
    }

    _setDescription(){
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this
            .date.getMonth()]} ${this.date.getDate()}`;
    }

    // click(){
    //     this.click++;
    //     console.log(click);
    // }
};

class Running extends Workout{
    type = 'running';
    constructor(coords, distance, duration, cadence){
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();

    }

    calcPace() {
        //min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
};

class Cycling extends Workout{
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain){
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();

    }

    calcSpeed(){
        // km/h
        this.speed = this.distance/(this.duration/60);
        return this.speed;
    }
};

// const run = new Running([35, -12], 5.4, 24, 178);
// const cycle = new Cycling([45, -10], 27, 89, 523);
// console.log(run, cycle);


/////////////////////////////////////////////////////////
//APPLICATION ARCHITECHTURE

class App{
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor(){ //All the code that is executed right when the application loads
        //Get user's position
        this._getPosition();  ///to call the getPosition method as soon as we launch the App, that is by its constructor
        
        //Get data from local storage
        this._getLocalStorage();

        //Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));  //here by default the "this" keyword will be the dom element on which the event handler is attached ie form, so we need to fix this using bind
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    }

    _getPosition(){
        navigator.geolocation?.getCurrentPosition(this._loadMap.bind(this), ///we have to bind the "this" keyword to the loadMap method 
                                                                            //otherwise it is just a normal function declaration and its "this" keyword will be undefined
        function(){
            alert("Could not get your position");
        });
    }

    _loadMap(position){
        
            const {latitude} = position.coords;
            const {longitude} = position.coords;
            //console.log(latitude, longitude);
            //console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    
            const coords = [latitude, longitude];
            
            this.#map = L.map('map').setView(coords, this.#mapZoomLevel); //array of coordinates and the zoom level
    
            L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.#map);  //now #map is private property
      
            
            //Handling clicks on map
            this.#map.on('click', this._showForm.bind(this)); ///we have to bind the "this" keyword again here otherwise it is attached to the map object on which it is called but we need it attached to the App object
        
            this.#workouts.forEach(work => {
                this._renderWorkoutMarker(work);
                
            });
        }
    

    _showForm(mapE){
        this.#mapEvent = mapE;  ///#mapEvent is also a private property
            
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm(){
        //Empty the inputs 
        inputDistance.value = inputElevation.value = inputCadence.value = inputDuration.value = '';

        form.style.display = 'none';
        //Hide the form
        form.classList.add('hidden');
        setTimeout(( () => form.style.display = 'grid'), 1000);

    }

    _toggleElevationField(){
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e){
        e.preventDefault();

        const validInputs = 
        (...inputs) => inputs.every(inp => Number.isFinite(inp));

        const allPositive = (...inputs) => inputs.every(inp => inp>0);

        ///Get data from form
        const type = inputType.value;
        const distance = Number(inputDistance.value);
        const duration = Number(inputDuration.value);
        const {lat, lng} = this.#mapEvent.latlng;
        let workout;
        



        // If workout is running, create a running object
        if(type === 'running'){
            const cadence = Number(inputCadence.value);
            // CHeck if data is valid
             if(
            //     !Number.isFinite(distance) ||
            //     !Number.isFinite(duration) ||
            //     !Number.isFinite(cadence)
                (!validInputs(distance, duration, cadence)) || 
                (!allPositive(distance, duration, cadence))
            ) return alert("Inputs have to be positive numbers!");

            workout = new Running([lat, lng], distance, duration, cadence);
        }

        //If workout is cycling, create a cycling object

        if(type === 'cycling'){
            const elevation = Number(inputElevation.value);

            // CHeck if data is valid
            if((!validInputs(distance, duration, elevation)) || 
                (!allPositive(distance, duration))
            ) return alert("Inputs have to be positive numbers!");

            workout = new Cycling([lat, lng], distance, duration, elevation);

            
        }

        //Add new object to workout array
        this.#workouts.push(workout);

        //Render workout on map as marker
        //Display Marker;
        this._renderWorkoutMarker(workout);
       

        //Render workout on list
        this._renderWorkout(workout);

        //Hide form + Clear input fields
        this._hideForm();

        ///Set local storage to all workouts
        this._setLocalStorage();
            
    }

    _renderWorkoutMarker(workout){
        L.marker(workout.coords)
       .addTo(this.#map)
       .bindPopup(L.popup({
               maxWidth: 250,
               minWidth: 100,
               autoClose: false,
               closeOnClick: false,
               className: `${workout.type}-popup`
       }))
       .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️': '🚴‍♀️'} ${workout.description}`)
       .openPopup();
    }

    _renderWorkout(workout){
       let html  = `
       <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
                workout.type === 'running' ? '🏃‍♂️': '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;

        if(workout.type === 'running'){
            html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`
        }

        if(workout.type === 'cycling'){
            html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
            </li>`;
        }

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e){
        const workoutEl = e.target.closest('.workout');
        //console.log(workoutEl); 

        if(!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
        
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });

        ////using the public interface
       // workout.click();
    }

    _setLocalStorage(){
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));

    }

    _getLocalStorage(){
        const data = JSON.parse(localStorage.getItem('workouts'));


        if(!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {
            this._renderWorkout(work);
            //the markers cannot be loaded here from the workouts of the local storage
            //because the map is still not loaded yet and this getLocalStorage methods is 
            //executed at the very begining because it is called by the constructor
            //so we need to load the markers after the map is loaded. i.e we can do it at the end
            //of the loadMap method
        });
    }

    ///Public interface method

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }

    
};

const app = new App();
//app._getPosition();



 

 