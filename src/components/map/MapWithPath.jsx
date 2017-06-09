import React from 'react'
import Request from 'request'
import Chip from 'material-ui/Chip'

const getCourseDuration = (total_sec) => {
  var jour = Math.floor(total_sec / (24 * 3600))
  total_sec = total_sec - (jour * 24 * 3600)
  var heure = Math.floor(total_sec / 3600)
  total_sec = total_sec - (heure * 3600)
  var minute = Math.floor(total_sec / 60)
  heure = heure + (jour * 24)

  return heure + ' heures et ' + minute + " minutes"
}

const chipStyle = {
  position: "fixed",
  bottom: 0,
  zIndex: 1,
  backgroundColor: "white",
  left: "40%"
}

export default class MapWithPath extends React.Component {

  constructor (props) {
    super(props)

    this.state = {
      map: null,
      path: props.path,
      currentPosition: null,
      duration: 0,
      distance: 0
    }
    this._setMarker = this._setMarker.bind(this)
    this._getWaypoints = this._getWaypoints.bind(this)
    this._setRoute = this._setRoute.bind(this)
    this._updateCurrentPosition = this._updateCurrentPosition.bind(this)
  }

  componentWillReceiveProps (nextProps) {
    this.setState({ path: nextProps.path })
  }

  _updateCurrentPosition () {
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(pos => {
      const currentPosition = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude)
      this.setState({ currentPosition })
      resolve(pos)
    }, reject))
  }

  componentDidMount () {
    // make a request to geocode to get the coordinates from an address
    Request(`http://maps.google.com/maps/api/js?language=fr&libraries=places&key=AIzaSyAtu5-1cj7wJeCiUVC0zhIbWHDtee4fDlo`, (error, response, body) => {
      const TROYES_CENTER = new google.maps.LatLng(48.2973725, 4.0721523)
      const options = {
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.TERRAIN,
        maxZoom: 20,
        center: TROYES_CENTER,
      }

      // init the map
      const map = new google.maps.Map(document.getElementById('map'), options)
      return this._updateCurrentPosition()
        .then(() =>this._getWaypoints(map))
        .then(waypoints => Promise.all(waypoints.map(waypoint => this._setMarker(map, waypoint)))
          .then(() => this._setRoute(map, waypoints))
        )
        .then(() => this.setState({ map }))
    })
  }

  _getWaypoints () {
    return Promise.all(this.state.path.map(element => {
      return new Promise((resolve, reject) =>
        Request(`https://maps.googleapis.com/maps/api/geocode/json?address=${element.spatial[ 0 ]}&key=AIzaSyAtu5-1cj7wJeCiUVC0zhIbWHDtee4fDlo`, (error, response, body) => {
          resolve({
            name: element.name[ 0 ],
            coordinates: JSON.parse(body).results[ 0 ].geometry.location
          })
        })
      )
    }))
  }

  _setMarker (map, waypoint) {
    return new Promise((resolve, reject) => {
      const marker = new google.maps.Marker({
        position: waypoint.coordinates,
        map: map,
        label: waypoint.name
      })
      resolve(marker)
    })
  }

  _setRoute (map, waypoints) {
    const googleDirectionService = new google.maps.DirectionsService()
    const googleDirectionRenderer = new google.maps.DirectionsRenderer({ map })

    const options = {
      origin: this.state.currentPosition,
      destination: waypoints[ waypoints.length - 1 ].coordinates,
      waypoints: waypoints.map(waypoint => ({ location: waypoint.coordinates })),
      travelMode: google.maps.DirectionsTravelMode.WALKING,
      optimizeWaypoints: true
    }

    return new Promise((resolve, reject) => googleDirectionService.route(options, (direction, requestStatus) => {
        let duration = 0
        let distance = 0
        if (requestStatus == google.maps.DirectionsStatus.OK) {
          googleDirectionRenderer.setDirections(direction)
          direction.routes[ 0 ].legs.map(element => {
            duration += element.duration.value
            distance += element.distance.value
          })
          this.setState({ duration, distance })
        }
      })
    )
  }

  render () {
    return (
      <div className="fullheight">
        <Chip style={chipStyle}>Distance: {Math.ceil(this.state.distance / 1000)} -
          Durée: {getCourseDuration(this.state.duration)}</Chip>
        <div id="map"></div>
      </div>
    )
  }

}