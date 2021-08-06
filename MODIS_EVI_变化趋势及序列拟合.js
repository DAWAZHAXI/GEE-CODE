  
  
  Map.style().set('cursor', 'crosshair');
///////////////////////////////////////////////////////////////////=================
//////////////////////////////////////////////////////////////////===================
Map.centerObject(table, 4.5);
var MODIS = imageCollection.filterDate('2000-01-01','2020-01-01') 
                           .filterBounds(table)
                           .select('EVI');
print(MODIS.first());
var Vis = {
  min: 0,
  max: 1,
  palette: [
    'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901',
    '66A000', '529400', '3E8601', '207401', '056201', '004C00', '023B01',
    '012E01', '011D01', '011301'
  ],
};
Map.centerObject(table,4.5);

Map.addLayer(MODIS.first().clip(table).multiply(0.0001), Vis, 'MODIS_EVI_20020704');

// Star to linear regression
function createTimeBand(img) {
 //var day = img.date().difference(ee.Date('2017-01-01'), 'day');
 //return ee.Image(day).float().addBands(img);
 
 return img.addBands(img.metadata('system:time_start')
           .divide(1000*60*60*24*365));
}

var collection = MODIS
   .select('EVI')
   .filterDate('2000-01-01','2020-01-01')
   .map(createTimeBand);
   
var fit = collection
   .select(['system:time_start','EVI'])
   .reduce(ee.Reducer.linearFit());
  
/*Map.addLayer(ee.Image(collection.select('NDVI').first().clip(geometry)),
         {min: -1, max: 1}, 'NDVI');*/

//
var Viscolor = {
  min: -0.003,
  max: 0.005,
  palette: ['e90000','ff4a2d','e7eb05','0aab1e','001137'],
};
var fitt =fit.select('scale').clip(table).multiply(0.0001);
 
 
Map.addLayer(fitt,Viscolor, 'EVItrend');
////////////////////////////////////////////////////////////////
var VIS_MAX_VALUE = 0.01;
var VIS_NONLINEARITY = 1;
function colorStretch(image) {
  return image.divide(VIS_MAX_VALUE)
      .pow(0.00001 * VIS_NONLINEARITY);
}
function undoColorStretch(val) {
  return Math.pow(val, VIS_NONLINEARITY) * VIS_MAX_VALUE;
}

function ColorBar(palette) {
  return ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: {
      bbox: [0, 0, 1, 0.1],
      dimensions: '100x10',
      format: 'png',
      min: 0,
      max: 1,
      palette: palette,
    },
    style: {stretch: 'horizontal', margin: '0px 8px'},
  });
}
///////////////////////////////////

// Returns our labeled legend, with a color bar and three labels representing
// the minimum, middle, and maximum values.
// function makeLegend() {
//   var labelPanel = ui.Panel(
//       [
//         ui.Label(Math.round(undoColorStretch(0)), {margin: '4px 8px'}),
//         ui.Label(
//             Math.round(undoColorStretch(0.5)),
//             {margin: '4px 8px', textAlign: 'center', stretch: 'horizontal'}),
//         ui.Label(Math.round(undoColorStretch(1)), {margin: '4px 8px'})
//       ],
//       ui.Panel.Layout.flow('horizontal'));
//   return ui.Panel([ColorBar(Viscolor.palette), labelPanel]);
// }

function makeLegend() {
  var labelPanel = ui.Panel(
      [
        ui.Label(undoColorStretch(-1), {margin: '4px 8px'}),
        ui.Label(
            undoColorStretch(0.5),
            {margin: '4px 8px', textAlign: 'center', stretch: 'horizontal'}),
        ui.Label(undoColorStretch(1), {margin: '4px 8px'})
      ],
      ui.Panel.Layout.flow('horizontal'));
  return ui.Panel([ColorBar(Viscolor.palette), labelPanel]);
}

// Styling for the legend title.
var LEGEND_TITLE_STYLE = {
  fontSize: '20px',
  fontWeight: 'bold',
  stretch: 'horizontal',
  textAlign: 'center',
  margin: '4px',
};

// Styling for the legend footnotes.
var LEGEND_FOOTNOTE_STYLE = {
  fontSize: '10px',
  stretch: 'horizontal',
  textAlign: 'center',
  margin: '4px',
};

// Assemble the legend panel.
Map.add(ui.Panel(
    [
      ui.Label('2000-2020年中国EVI每16天变化趋势（slope）', LEGEND_TITLE_STYLE), makeLegend(),
      ui.Label(
          '(采用MODIS_MYD13A1 EVI 16天 500m产品进行逐像元回归)', LEGEND_FOOTNOTE_STYLE),
      ui.Label(
          'Source: 中国科学院生态环境研究中心', LEGEND_FOOTNOTE_STYLE),
      ui.Label('周伟奇课题组', LEGEND_FOOTNOTE_STYLE)
    ],
    ui.Panel.Layout.flow('vertical'),
    {width: '230px', position: 'top-right'}));
/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
// var histogram = ui.Chart.image.histogram({
//   image: fitt.toDouble(),
//   region: geometry,
//   scale: 500,
//   maxPixels: 1e9,
//   minBucketWidth: 35
// });
var histogram = ui.Chart.image.histogram({
  image: fitt,
  region: table,
  scale: 10000,
  maxPixels: 1e6,
  
});

histogram.setChartType('BarChart');
histogram.setOptions({
            title:'统计中国境内EVI变化斜率的像素频度', 
            
            vAxis: {title: '变化斜率', minValue: -0.01,  maxValue: 0.01},
            hAxis: {title: '像素频度', minValue: 0},
            fontSize: 14, 
});
//
  histogram.style().set({stretch: 'both'});
  
Map.add(ui.Panel([histogram],
    ui.Panel.Layout.flow('vertical'),
    {width: '500px', height: '300px', position: 'bottom-right'}));
////
//Map.addLayer(ee.Image().paint(geometry, 1, 1), null, 'Beijing');
Map.addLayer(ee.Image().paint(table, 1, 1), null, 'China');
///////////////////////////////////////////////////////////////////----------------------------------
//////////////////////////////////////////////////////////////////////-----------------------
// This field contains UNIX time in milliseconds.
var timeField = 'system:time_start';
// Use this function to mask clouds in Landsat 8 imagery.
// Use this function to add variables for NDVI, time and a constant
// to Landsat 8 imagery.
var addVariables = function(image) {
  // Compute time in fractional years since the epoch.
  var date = ee.Date(image.get(timeField));
  var years = date.difference(ee.Date('1970-01-01'), 'year');
  // Return the image with the added bands.
  return image
    // Add an NDVI band.
    .select('EVI').float()
    // Add a time band.
    .addBands(ee.Image(years).rename('t').float())
    // Add a constant band.
    .addBands(ee.Image.constant(1));
};

// add variables and filter to the area of interest.
var filteredLandsat = MODIS
  .filterBounds(table)
  .map(addVariables);
//////////////////////////////++++++++++++++++++++++++++++++++++++++++++++++++
////////////////////////////-------------------------------------
// List of the independent variable names
var independents = ee.List(['constant', 't']);

// Name of the dependent variable.
var dependent = ee.String('EVI');

// Compute a linear trend.  This will have two bands: 'residuals' and 
// a 2x1 band called coefficients (columns are for dependent variables).
var trend = filteredLandsat.select(independents.add(dependent))
    .reduce(ee.Reducer.linearRegression(independents.length(), 1));
// Map.addLayer(trend, {}, 'trend array image');

// Flatten the coefficients into a 2-band image
var coefficients = trend.select('coefficients')
  .arrayProject([0])
  .arrayFlatten([independents]);


//
var harmonicIndependents = ee.List(['constant', 't', 'cos', 'sin']);

// Add harmonic terms as new image bands.
var harmonicLandsat = filteredLandsat.map(function(image) {
  var timeRadians = image.select('t').multiply(2 * Math.PI);
  return image
    .addBands(timeRadians.cos().rename('cos'))
    .addBands(timeRadians.sin().rename('sin'));
});

// The output of the regression reduction is a 4x1 array image.
var harmonicTrend = harmonicLandsat
  .select(harmonicIndependents.add(dependent))
  .reduce(ee.Reducer.linearRegression(harmonicIndependents.length(), 1));

// Turn the array image into a multi-band image of coefficients.
var harmonicTrendCoefficients = harmonicTrend.select('coefficients')
  .arrayProject([0])
  .arrayFlatten([harmonicIndependents]);

// Compute fitted values.
var fittedHarmonic = harmonicLandsat.map(function(image) {
  return image.addBands(
    image.select(harmonicIndependents)
      .multiply(harmonicTrendCoefficients)
      .reduce('sum')
      .rename('fitted'));
});

///////////////////////////////=====================================
var panel = ui.Panel();
panel.style().set({
  width: '500px',
  position: 'bottom-left'
});
Map.add(panel);

// Register a function to draw a chart when a user clicks on the map.
Map.onClick(function(coords) {
  panel.clear();
  var point = ee.Geometry.Point(coords.lon, coords.lat);
    var dot = ui.Map.Layer(point, {color: 'FF0000'});
  var chart = ui.Chart.image.series(imageCollection.select('EVI'), point, null, 500);
  chart.setOptions({title: '点选区的EVI时间序列--线性拟合',
                   vAxis: {title: 'Slope value'},
                    hAxis: {title: 'date', format: 'yyyy', gridlines: {count: 7}},
                    trendlines: {0: {color: 'CC0000'}, lineWidth: 0.2, pointSize: 3,},
  });
  var chart2 = ui.Chart.image.series(fittedHarmonic.select(['fitted','EVI']), point,  null, 1000);
          chart2.setSeriesNames(['EVI', 'fitted']);
          chart2.setOptions({title: '点选区的EVI时间序列--周期拟合',
                   vAxis: {title: 'Slope value'},
                    hAxis: {title: 'date', format: 'yyyy', gridlines: {count: 7}},
                    
  });
  
  
  panel.add(chart);
  panel.add(chart2);
});

/////////////////////////////////////////
//////结束啦 再也不搞了/////////////////