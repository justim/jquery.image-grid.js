;(function($, window, undefined) {
	var document = window.document;
	
	$.fn.imageGrid = function(args) {
		// default options
		var bogus,
			e = function(message) {
				if (console && console.log && typeof console.log === 'function') {
					console.log(message);
				}
			},
			isFunction = function(func) {
				return func && typeof func === 'function';
			},
			defaultOptions = {
				speed: 1500,
				speedMargin: 200,
				how: 'vertical',
				api: false,
				shuffle: false, // @todo
				rows: null, // @todo
				columns: null, // @todo
				limit: Number.MAX_VALUE
			},
			
			// override the default options with parameters
			options = $.extend({}, defaultOptions, args),
			
			imageGrid = {
				Tile: function(image, loc) {
					var self = this,
						location = loc,
						
						$img = $(image),
						loaded = false,
						
						// save the tile (it the parent for now)
						$tile = $img.parent(),
						
						// save dimensions
						imageWidth,
						imageHeight,
						
						// save ratios
						widthRatio,
						heightRatio,
						
						// prepare the css for the tile
						tileCss,
						
						// prepare css for the image
						imageCss = {
							position: 'absolute',
							top: 0,
							left: 0
						},
						
						fadeSpeed = function() {
							return options.speed - options.speedMargin + Math.floor(Math.random() * options.speedMargin * 2);
						},
						
						// define some actions needed to get the tile proper on the screen
						actions = {
							// calculate the ratio
							calculateRatios: function() {
								// calculate some dimensions
								imageWidth = $img.width();
								imageHeight = $img.height();
								
								widthRatio = location.width / imageWidth;
								heightRatio = location.height / imageHeight;
							},
							
							// apply the tile css
							positionTile: function() {
								actions.calculateRatios();
								$tile.css(tileCss);
							},
							
							// apply the image css, based on the ratio
							applyImageCss: function() {
								if (widthRatio < heightRatio) {
									$.extend(imageCss, {
										height: location.height,
										width: 'auto'
									});
									
								} else {
									$.extend(imageCss, {
										width: location.width,
										height: 'auto'
									});
								}
								
								$img.css(imageCss);
							},
							
							// position the image relative to the tile
							positionImage: function() {
								actions.calculateRatios();
								actions.applyImageCss();
								
								// it need to go a bit to the left
								if (widthRatio < heightRatio) {
									$img.css({
										top: 'auto', // reset
										left: parseInt(location.width / 2) - parseInt($img.width() / 2)
									});
								}
								
								// we have to much image in height
								else {
									$img.css({
										left: 'auto', // reset
										top: parseInt(location.height / 2) - parseInt($img.height() / 2)
									});
								}
							},
							
							// show the image
							loadImage: function(src) {
								var completeCheck = true,
									completeCheckFunc = function() {
										if (this.complete) {
											$(this).trigger('load');
										}
									};
								
								if (src) {
									completeCheck = false;
									
									$('<img/>').attr('src', src).load(function() {
										actions.hideImage(function() {
											$img.attr('src', src).each(completeCheckFunc);
										});
									});
								}
								
								$img.one('load', function() {
									loaded = true;
									actions.positionImage();
									
									// makes it a big laggy (a lot actually)
									setTimeout(function() {
										actions.showImage();
									}, options.speedMargin + Math.floor(Math.random() * options.speedMargin * 2));
								});
								
								if (completeCheck) {
									$img.each(completeCheckFunc);
								}
							},
							showImage: function(callback) {
								$img.fadeIn(fadeSpeed(), function() {
									if (isFunction(callback)) callback.apply(api);
									$(self).trigger('image-show');
								});
							},
							hideImage: function(callback) {
								$img.fadeOut(fadeSpeed(), function() {
									if (isFunction(callback)) callback.apply(api);
									$(self).trigger('image-hide');
								});
							}
						},
						api = {
							load: function(src) {
								actions.loadImage(src);
							},
							show: function() {
								actions.showImage();
							},
							hide: function(callback) {
								actions.hideImage(callback);
							},
							setLocation: function(loc) {
								location = loc;
								
								tileCss = {
									position: 'absolute',
									top: location.top,
									left: location.left,
									width: location.width,
									height: location.height,
									overflow: 'hidden'
								};
								
								actions.positionTile();
								actions.positionImage();
								
								// return the API for chaining
								return this;
							},
							getLocation: function() {
								return location;
							}
						};
					
					// give the outside world some functions to play with
					return api;
				}
			},
			
			// store the container for later use
			$container = $(this),
			
			// save the dimensions of the container
			containerWidth,
			containerHeight,
			
			// init an grid
			tiles = [],
			
			// store the images used & and their quantity
			images = $('img', $container),
			totalImages = images.length,
			limit = options.limit,
			setLimit = function(lim) {
				limit = lim;
			},
			visibleImages = function() {
				return Math.min(totalImages, limit);
			},
			
			// define some strategies, these can be extended
			strategies = function() {
				return {
					vertical: {
						getLocation: function(i, total) {
							return {
								width: containerWidth / total,
								height: containerHeight,
								left: i * containerWidth / total,
								top: 0
							};
						}
					},
					horizontal: {
						getLocation: function(i, total) {
							return {
								width: containerWidth,
								height: containerHeight / total,
								left: 0,
								top: i * containerHeight / total
							};
						}
					}
				}
			}(),
			currentStrategy,
			init = function() {
				// static is bad
				if ($container.css('position') === 'static') {
					// relative is better
					$container.css('position', 'relative');
				}
				
				calculateContainerDimensions();
				
				// only doing it once
				if (!$container.data('image-grid-started')) {
					// insta hide the images
					$container.css({
						visibility: 'visible'
					});
					
					images.hide().each(function() {
						tiles.push(imageGrid.Tile(this));
					});
				
					$container.data('image-grid-started', true);
				}
			},
			calculateContainerDimensions = function() {
				containerWidth = $container.width();
				containerHeight = $container.height();
			},
			executeStrategy = function() {
				var grid = [];
				
				if (!strategies[options.how]) {
					options.how = defaultOptions.how;
				}
				
				currentStrategy = strategies[options.how];
				
				$.each(tiles, function(i) {
					grid.push(currentStrategy.getLocation(i, visibleImages()));
				});
				
				return grid;
			},
			start = function() {
				var grid;
				
				init();
				firstRun = false;
				
				grid = executeStrategy();
				
				$.each(tiles, function(i) {
					this.setLocation(grid[i]).load();
				});
			};
		
		if (options.api) {
			return {
				run: function() {
					start();
				}
			};
			
		} else {
			// start it all
			start();
			
			return this;
		}
	}
})(jQuery, this);
