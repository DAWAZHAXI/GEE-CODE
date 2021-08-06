// Convert the zones of the thresholded nightlights to vectors.
var vectors = zones.addBands(nl2013).reduceToVectors({
  geometry: table,
  crs: nl2013.projection(),
  scale: 1000,
  maxPixels: 1e13,
  geometryType: 'polygon',
  eightConnected: false,
  labelProperty: 'zone',
  reducer: ee.Reducer.mean()
});

// Make a display image for the vectors, add it to the map.
//var display = ee.Image(0).updateMask(0).paint(vectors, '000000', 3);
//Map.addLayer(display, {palette: '000000'}, 'vectors');
// Create a map to be used as the zoom box.
var zoomBox = ui.Map({style: {stretch: 'both', shown: false}})
    .setControlVisibility(false);
zoomBox.addLayer(zones, visParams);

// Update the center of the zoom box map when the base map is clicked.
Map.onClick(function(coords) {
  centerZoomBox(coords.lon, coords.lat);
});

var centerZoomBox = function(lon, lat) {
  instructions.style().set('shown', false);
  zoomBox.style().set('shown', true);
  zoomBox.setCenter(lon, lat, 7.5);
  var bounds = zoomBox.getBounds();
  var w = bounds[0], e = bounds [2];
  var n = bounds[1], s = bounds [3];
  var outline = ee.Geometry.MultiLineString([
    [[w, s], [w, n]],
    [[e, s], [e, n]],
    [[w, s], [e, s]],
    [[w, n], [e, n]],
  ]);
  var layer = ui.Map.Layer(outline, {color: 'FFFFFF'}, 'Zoom Box Bounds');
  Map.layers().set(1, layer);
};

// Add a label and the zoom box map to the default map.
var instructions = ui.Label('点击鼠标放大查看空间细节', {
  stretch: 'both',
  textAlign: 'center',
  backgroundColor: '#d3d3d3'
});
var panel = ui.Panel({
  widgets: [zoomBox, instructions],
  style: {
    position: 'top-right',
    height: '300px',
    width: '300px',
  }
});
Map.add(ui.Label('基于灯光数据提取城市边界'));
Map.add(panel);