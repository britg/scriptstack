/*!
 * jquery.qtip. The jQuery tooltip plugin
 *
 * Copyright (c) 2009 Craig Thompson
 * http://craigsworks.com
 *
 * Licensed under MIT
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Launch	: February 2009
 * Version  : TRUNK - NOT FOR USE IN PRODUCTION ENVIRONMENTS!!!!
 * Debugging: jquery.qtip.debug.js
 *
 * FOR STABLE VERSIONS VISIT: http://craigsworks.com/projects/qtip/download/
 */

/*jslint onevar: true, browser: true, forin: true, undef: true, nomen: true, eqeqeq: true, bitwise: true, regexp: true, newcap: true, maxerr: 300 */
/*global window: false, jQuery: false */
(function($)
{
	var ieCSS, isIE6 = ($.browser.msie && parseInt($.browser.version, 10) === 6), tips;

	// IE FIXES - VML and style problems
	if($.browser.msie && !document.styleSheets.qtip_vml)
	{
		// Add VML namespace
      document.namespaces.add('vml', 'urn:schemas-microsoft-com:vml', '#default#VML');

      // Create new stylesheet and set its ID so we only create it once
		ieCSS = document.createStyleSheet();
		ieCSS.owningElement.id = 'qtip_vml';

		// Set style fixes for tooltip elementsand VML
		ieCSS.cssText = '.ui-tooltip-content{ display: inline-block; }'; // Fixes element overlap issues e.g. images disappearing in content
		$.each(['shape','rect', 'oval', 'circ', 'fill', 'stroke', 'imagedata', 'group','textbox'],
			function(){ ieCSS.addRule('vml\\:' + this, 'behavior:url(#default#VML); antialias:true; display:inline-block;'); }
		);
	}

	/*
	 * Private core functions
	 */

	// Convert content.url object into $.ajax object
	function contentAjax()
	{
		var self = this, i, options, ajax;

		// Setup options and sanitize
		options = self.options.content.url;
		ajax = $.extend({}, self.options.content.url);
		for(i in $.fn.qtip.defaults.content.url) delete ajax[i];

		return ajax;
	}

	// IE6 max-width/min-width simulator function
	function updateWidth(newWidth)
	{
		var self = this, elems = this.elements, max, min;

		// Make sure tooltip is rendered and if not, return
		if(!self.rendered) return false;

		// Make sure the browser is IE, as all other browsers use max-width correctly
		else if(!$.browser.msie) return false;

		// Determine actual width
		elems.tooltip.css({ width: 'auto', maxWidth: 'none' });
		newWidth = self.getDimensions().width;
		elems.tooltip.css({ maxWidth: '' });

		// Parse and simulate max and min width
		max = parseWidth(elems.tooltip.css('max-width')) || 0;
		min = parseWidth(elems.tooltip.css('min-width')) || 0;
		newWidth = Math.min( Math.max(newWidth, min), max );
		if(newWidth % 2) newWidth += 1;

		// Set the new calculated width and if width has not numerical, grab new pixel width
		elems.tooltip.width(newWidth);
		newWidth = self.getDimensions().width;

		return self;
	};

	// Parses width values into standard base 10 integer
	function parseWidth(width)
	{
		return parseInt(String(width).replace(/([0-9]+)/i, "$1"), 10);
	}

	// Create title bar for content
	function createTitle()
	{
		var self = this, elems = this.elements;

		// Destroy previous title element, if present
		if(elems.title !== null) elems.title.remove();

		// Create elements
		elems.tooltip.prepend(
			'<div class="ui-tooltip-titlebar ui-widget-header">' +
				'<a class="ui-tooltip-close ui-state-default" role="button"><span class="ui-icon ui-icon-close"></span></a>' +
				'<div id="ui-tooltip-title-'+self.id+'" class="ui-tooltip-title"></div>' +
			'</div>'
		);
		elems.titlebar = elems.tooltip.find('.ui-tooltip-titlebar').eq(0);
		elems.title = elems.tooltip.find('.ui-tooltip-title').eq(0);
		elems.button = elems.tooltip.find('.ui-tooltip-close').eq(0);

		// Update title with contents
		self.updateTitle.call(self, self.options.content.title.text);

		// Create title close buttons if enabled
		if(self.options.content.title.button)
		{
			elems.button.hover(
				function(){ $(this).addClass('ui-state-hover'); },
				function(){ $(this).removeClass('ui-state-hover'); }
			)
			.click(function()
			{
				if(elems.tooltip.hasClass('ui-state-disabled')){
					return false;
				}
				else{
					self.hide();
				}
			})
			.bind('mousedown keydown', function(){ $(this).addClass('ui-state-active ui-state-focus'); })
			.bind('mouseup keyup click mouseout', function(){ $(this).removeClass('ui-state-active ui-state-focus'); });
		}
		else elems.button.remove();
	}

	// Assign hide and show events
	function assignEvents()
	{
		var self = this, targets, inactiveMethod, events,
			show = this.options.show, hide = this.options.hide, elems = this.elements;

		// Setup event and target variables
		targets = { show: show.when.target, hide: hide.when.target };
		events = {
			show: show.when.event,
			hide: (hide.when.event === false) ? 'mouseout' : hide.when.event,
			inactive: ['click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseout', 'mouseover']
		};

		// Add tooltip as a hide target if fixed
		if(hide.fixed) targets.hide = targets.hide.add(elems.tooltip);

		// Check if the hide event is special 'inactive' type
		if(events.hide === 'inactive')
		{
			// Define 'inactive' event timer method and bind it as custom event
			inactiveMethod = function(event)
			{
				if(elems.tooltip.hasClass('ui-state-disabled')) return;

				//Clear and reset the timer
				clearTimeout(self.timers.inactive);
				self.timers.inactive = setTimeout(function(){ self.hide(event); }, hide.delay);
			};
			targets.show.bind('qtip-inactive', inactiveMethod);

			// Define events which reset the 'inactive' event handler
			$(events.inactive).each(function(){ targets.hide.add(elems.content).bind(this+'.qtip-inactive', inactiveMethod); });
		}

		// Check if the tooltip is 'fixed'
		else if(hide.fixed === true)
			elems.tooltip.bind('mouseover.qtip', function(){ if(!elems.tooltip.hasClass('ui-state-disabled')) clearTimeout(self.timers.hide); });

		// Define hide method
		function hideMethod(event)
		{
			if(elems.tooltip.hasClass('ui-state-disabled')) return;

			// Clear timers and stop animation queue
			clearTimeout(self.timers.show);
			clearTimeout(self.timers.hide);

			if(hide.when.event !== false)
			{
				// Prevent hiding if tooltip is fixed and event target is the tooltip
				if(hide.fixed === true &&
					events.hide.search(/mouse(out|leave)/i) !== -1 &&
					$(event.relatedTarget).parents('div.qtip[qtip]').length > 0)
				{
					// Prevent default and popagation
					event.stopPropagation();
					event.preventDefault();

					// Reset the hide timer
					clearTimeout(self.timers.hide);
					return false;
				}

				// If tooltip has displayed, start hide timer
				elems.tooltip.stop(true, true);
				self.timers.hide = setTimeout(function(){ self.hide(event); }, hide.delay);
			}
		}

		// Define show event method
		function showMethod(event)
		{
			if(elems.tooltip.hasClass('ui-state-disabled')) return;

			// If set, hide tooltip when inactive for delay period
			if(events.hide === 'inactive') targets.show.trigger('qtip-inactive');

			// Clear hide timers
			clearTimeout(self.timers.show);
			clearTimeout(self.timers.hide);

			// Start show timer
			self.timers.show = setTimeout(function()
			{
				// Update content if content.url.once is set to true
				if(!self.options.content.url.once)
				{
					// Setup options and sanitize
					var options = self.options.content.url,
					ajax = contentAjax.call(self);

					// Load the content with specified options
					self.loadContent(options.path, options.data, options.method || 'get', ajax, true);
				}

				// Show the tooltip
				self.show(event);
			},
			show.delay);
		}

		// Both events and targets are identical, apply events using a toggle
		if((show.when.target.add(hide.when.target).length === 1 &&
			events.show === events.hide && events.hide !== 'inactive') || events.hide === 'unfocus')
		{
			targets.show.bind(events.show + '.qtip', function(event)
			{
				if(elems.tooltip.is(':visible')) hideMethod(event);
				else showMethod(event);
			});
		}

		// Events are not identical, bind normally
		else
		{
			targets.show.bind(events.show + '.qtip', showMethod);

			// If the hide event is not 'inactive', bind the hide method
			if(events.hide !== 'inactive') targets.hide.bind(events.hide + '.qtip', hideMethod);
			if(events.show === 'mouseover') targets.hide.bind('mouseout.qtip', hideMethod);
		}

		// Focus the tooltip on mouseover
		if(self.options.position.type.search(/(fixed|absolute)/) !== -1)
			elems.tooltip.bind('mouseover.qtip', function(){ self.focus(); });

		// If mouse is the target, update tooltip position on mousemove
		if(self.options.position.target === 'mouse')
		{
			targets.show.bind('mousemove.qtip', function(event)
			{
				// Set the new mouse positions if adjustment is enabled
				cacheMouse.call(self, { left: event.pageX, top: event.pageY });

				// Update the tooltip position only if the tooltip is visible and adjustment is enabled
				if(!elems.tooltip.hasClass('ui-state-disabled') &&
				self.options.position.adjust.mouse === true && elems.tooltip.is(':visible'))
					self.updatePosition(event);
			});
		}
	}

	// Corner object parser
	function Corner(corner)
	{
		this.x = String(corner).replace(/middle/i, 'center').match(/left|right|center/i)[0].toLowerCase();
		this.y = String(corner).replace(/middle/i, 'center').match(/top|bottom|center/i)[0].toLowerCase();
		this.offset = { left: 0, top: 0 };
		this.precedance = (corner.charAt(0).search(/t|b/) > -1) ? 'y' : 'x';
	}
	Corner.prototype.toString = function(){ return (this.precedance === 'y') ? this.y+this.x : this.x+this.y; };
	Corner.prototype.clone = function(){ return { x: this.x, y: this.y, precedance: this.precedance, offset: this.offset, toString: this.toString }; };

	// Mouse position cacher
	function cacheMouse(offset)
	{
		this.cache.mouse = $.Event('mousemove');
		this.cache.mouse.pageX = offset.left;
		this.cache.mouse.pageY = offset.top;
	}

	/*
	 * Core plugin implementation
	 */
	function QTip(target, options, id)
	{
		// Declare this reference
		var self = this;

		// Setup class attributes
		self.id = id;
		self.options = options;
		self.rendered = false;
		self.elements = {
			target: target.data('qtip', true), // Apply deprecated data holder
			tooltip: null,
			wrapper: null,
			content: null,
			contentWrapper: null,
			titlebar: null,
			title: null,
			button: null
		};
		self.cache = {
			content: { type: false, text: '' },
			mouse: {},
			position: {},
			tip: {}
		};
		self.timers = {};

		// Define exposed API methods
		$.extend(self, self.options.api);
	}

	 // Initialization method
	function _init(id, opts)
	{
		var config, obj;

		// Create unique configuration object
		config = $.extend(true, {}, opts);

		// Sanitize target options
		if(config.position.container === false) config.position.container = $(document.body);
		if(config.position.target === false) config.position.target = $(this);
		if(config.show.when.target === false) config.show.when.target = $(this);
		if(config.hide.when.target === false) config.hide.when.target = $(this);

		// Initialize the tooltip and add API reference
		obj = new QTip($(this), config, id);
		$.fn.qtip.interfaces.push(obj);
		return obj;
	}

	/*
	 * Public core methods
	 */
	QTip.prototype.render = function(show)
	{
		var self = this, content, ajax, options;

		// If tooltip has already been rendered, exit
		if(self.rendered) return false;

		// Call API method and set rendered status (-1: rendering, -2: rendering and show when done)
		self.rendered = show ? -2 : -1;
		self.beforeRender.call(self);

		// Create initial tooltip elements
		self.elements.tooltip =  '<div qtip="'+self.id+'" id="qtip-'+self.id+'" class="qtip ui-tooltip ui-widget ui-helper-reset '+self.options.style.classes+'"' +
			' style="position:'+self.options.position.type+'; z-index:'+($.fn.qtip.constants.baseIndex + $('.qtip.ui-tooltip').length)+'"' +
			' aria-describedby="ui-tooltip-content-'+self.id+'" aria-labelledby="ui-tooltip-title-'+self.id+'" role="tooltip">' +
			' <div class="ui-tooltip-wrapper">' +
			'		 <div id="ui-tooltip-content-'+self.id+'" class="ui-tooltip-content ui-widget-content"></div>' +
			'</div></div>';

		// Append to container element
		self.elements.tooltip = $(self.elements.tooltip);
		self.elements.tooltip.appendTo(self.options.position.container).data('qtip', true); // Apply deprecated data holder
		self.elements.wrapper = self.elements.tooltip.children('div:first');
		self.elements.content = self.elements.wrapper.children('div:first');

		// Apply qCorner border if enabled and qCorner plugin is present
		if($.fn.qcorner && typeof self.options.style.border === 'object')
		{

			self.elements.tooltip.addClass('ui-tooltip-accessible').css({ borderWidth: self.options.style.border.border.width })

			self.options.style.border = self.elements.tooltip.qcorner( $.extend(true, self.options.style.border, { wrap: false }) )

			self.elements.tooltip.removeClass('ui-tooltip-accessible');

		}

		// Convert position corner values into x and y strings
		self.options.position.corner.target = new Corner(self.options.position.corner.target);
		self.options.position.corner.tooltip = new Corner(self.options.position.corner.tooltip);

		// Create tips if supported by the browser
		if(self.options.style.tip.corner)
		{
			if(self.options.style.tip.corner) self.options.style.tip.corner = new Corner(self.options.style.tip.corner);
			if(self.options.style.tip.type) self.options.style.tip.type = new Corner(self.options.style.tip.type);
			tips.create.call(self);
		}

		// If the positioning target element is an AREA element, cache the imagemap properties
		if($.fn.qtip.imagemap && self.options.position.target.is('area') === true) $.fn.qtip.imagemap.setup.call(self);

		// Use the provided content string or DOM array
		if((typeof self.options.content.text === 'string' && self.options.content.text.length > 0) ||
		(self.options.content.text.jquery && self.options.content.text.length > 0))
			content = self.options.content.text;

		// No valid content was provided, cannot proceed
		else
		{
			if(self.options.content.url.path === false) self.destroy();
			else content = 'Loading...';
		}

		// Set the tooltips content and create title if enabled
		if(self.options.content.title.text !== false) createTitle.call(self);
		self.updateContent(content);

		// Retrieve ajax content if provided
		if(self.options.content.url.path !== false)
		{
			// Setup options and sanitize
			options = self.options.content.url;
			ajax = contentAjax.call(self);

			// Load the content with specified options
			self.loadContent(options.path, options.data, options.method || 'get', ajax, true);
		}

		// Assign events and show & focus tooltip if needed
		assignEvents.call(self);

		// Call API method
		self.onRender.call(self);

		return self;
	};

	QTip.prototype.show = function(event, duration)
	{
		var self = this, tooltip = this.elements.tooltip, showOpts = this.options.show, api, i;

		// Make sure tooltip is rendered and if not, return
		if(!self.rendered) return false;

		// Make sure original target is still present and if not, destroy tooltip
		else if(self.elements.target.length < 1) return false;

		// Only continue if element is visible
		else if(tooltip.is(':visible')) return self;

		// Use initial option duration if not passed manually
		if(typeof duration !== 'number') duration = showOpts.effect.duration;

		// Clear animation queue
		tooltip.stop(true, false);

		// Call API method and if return value is false, halt
		if(self.beforeShow.call(self, event) === false) return self;

		// Define afterShow callback method
		function afterShow()
		{
			// Reset opacity to avoid bugs and focus if it isn't static
			$(this).css({ opacity: '' });
			self.focus();

			// Call API method
			self.onShow.call(self, event);

			// Set ARIA hidden status attribute
			$(this).attr('aria-hidden', 'false');

			// Prevent antialias from disappearing in IE7 by removing filter attribute
			if($.browser.msie && $(this).get(0).style) $(this).get(0).style.removeAttribute('filter');
		}

		// Update tooltip position
		self.updatePosition(event, (duration > 0 && showOpts.effect === false));

		// Hide other tooltips if tooltip is solo
		if(showOpts.solo === true)
		{
			i = $.fn.qtip.interfaces.length; while(i--)
			{
				// Access current elements API
				api = $.fn.qtip.interfaces[i];

				// Queue the animation so positions are updated correctly
				if(api && api.rendered && !api.elements.tooltip.is(':visible')) api.hide();
			}
		}

		// Show tooltip
		if(typeof showOpts.effect.type === 'function')
		{
			showOpts.effect.type.call(self, tooltip, duration);
			tooltip.queue(function(){ afterShow(); $(this).dequeue(); });
		}
		else
		{
			if(showOpts.effect.type === false || tooltip.is(':animated'))
			{
				tooltip.show();
				afterShow();
			}
			else
			{
				switch(showOpts.effect.type.toLowerCase())
				{
					case 'fade':
						tooltip.fadeIn(duration, afterShow);
						break;
					case 'slide':
						tooltip.slideDown(duration, function()
						{
							afterShow();
							self.updatePosition(event);
						});
						break;
					case 'grow':
						tooltip.show(duration, afterShow);
						break;
					default:
						tooltip.show();
						afterShow();
						break;
				}
			}
		}

		// If inactive hide method is set, active it
		showOpts.when.target.trigger('qtip-inactive');

		return self;
	};

	QTip.prototype.hide = function(event, duration)
	{
		var self = this, tooltip = this.elements.tooltip, hideOpts = this.options.hide;

		// Make sure tooltip is rendered and if not, return
		if(!self.rendered) return false;

		// Only continue if element is visible
		else if(!tooltip.is(':visible')) return self;

		// Use initial option duration if not passed manually
		if(typeof duration !== 'number') duration = hideOpts.effect.duration;

		// Stop show timer and animation queue
		clearTimeout(self.timers.show);
		tooltip.stop(true, false).css({ opacity: '' });

		// Call API method and if return value is false, halt
		if(self.beforeHide.call(self, event) === false) return self;

		// Define afterHide callback method
		function afterHide()
		{
			// Reset opacity to avoid bugs and call onHide event
			$(this).css({ opacity: '', height: '' });
			self.onHide.call(self, event);

			// Set ARIA hidden status attribute
			$(this).attr('aria-hidden', 'true');
		}

		// Hide tooltip
		if(typeof hideOpts.effect.type === 'function')
		{
			hideOpts.effect.type.call(self, tooltip, duration);
			tooltip.queue(function(){ afterHide(); $(this).dequeue(); });
		}
		else
		{
			if(hideOpts.effect.type === false)
			{
				tooltip.hide();
				afterHide();
			}
			else
			{
				switch(hideOpts.effect.type.toLowerCase())
				{
					case 'fade':
						tooltip.fadeOut(duration, afterHide);
						break;
					case 'slide':
						tooltip.slideUp(duration, afterHide);
						break;
					case 'grow':
						tooltip.hide(duration, afterHide);
						break;
					default:
						tooltip.hide();
						afterHide();
						break;
				}
			}
		}

		return self;
	};

	QTip.prototype.updatePosition = function(event, animate)
	{
		var self = this, posOptions = self.options.position, threshold = self.options.position.adjust.effect.threshold;

		// Make sure tooltip is rendered and set animation switch if omitted
		if(!self.rendered) return false;
		if(typeof animate === 'undefined') animate = posOptions.adjust.effect.type;

		// Ensure parsed corners haven't changed
		if(typeof posOptions.corner.target !== 'object') posOptions.corner.target = new Corner(posOptions.corner.target);
		if(typeof posOptions.corner.tooltip !== 'object') posOptions.corner.tooltip = new Corner(posOptions.corner.tooltip);
		if(typeof self.options.style.tip.corner !== 'object' && self.options.style.tip.corner) self.options.style.tip.corner = new Corner(self.options.style.tip.corner);

		// Setup position application function
		function applyPosition(newPosition, offset)
		{
			// Update tip position if tips are enabled
			if(self.options.style.tip.corner !== false)
			{
				var newCorner = self.options.style.tip.corner.clone();

				if(posOptions.adjust.screen === 'flip')
				{
					if(offset.left && newCorner.x !== 'center')
						newCorner.x = newCorner.x === 'left' ? 'right' : 'left';

					if(offset.top && newCorner.y !== 'center')
						newCorner.y = newCorner.y === 'top' ? 'bottom' : 'top';
				}

				else if(posOptions.adjust.screen === 'fit')
				{
					newCorner.offset = offset;

					if((offset.left < offset.top) && newCorner.precedance === 'y' && newCorner.x.search(/center/) < 0)
						newCorner.precedance = 'x';
					else if((offset.left > offset.top) && newCorner.precedance === 'x' && newCorner.y.search(/center/) < 0)
						newCorner.precedance = 'y';
					else
						newCorner.offset = { left: 0, top: 0 };
				}

				if(newCorner.precedance !== self.options.style.tip.corner.precedance || self.cache.tip.user.toString() !== newCorner.toString())
					tips.create.call(self, newCorner);
				else
					tips.position.call(self, newCorner);

				// Adjust positioning to account for tip dimensions
				if(newCorner.precedance === 'x')
					newPosition.left += (newCorner.x === 'right' ? -1 : 1) * (self.options.style.tip.size.width - Number($.browser.msie));
				else
					newPosition.top += (newCorner.y === 'bottom' ? -1 : 1) * (self.options.style.tip.size.height - Number($.browser.msie));
			}

			// Call API method and if return value is false, halt
			if(self.beforePositionUpdate.call(self, event) === false) return self;

			// If mouse is the target, prevent position animation
			if(posOptions.target === 'mouse' && posOptions.adjust.mouse === true) animate = false;

			// Check animation boundary is within threshold and tooltip is not already being animated
			else
			{
				if(Math.max(threshold, offset.left, offset.top) !== threshold){ animate = 'fade'; threshold -1; }
				else if(self.elements.tooltip.is(':animated')) animate = false;
			}

			// Animate tooltip to new position
			switch(animate)
			{
				case 'slide':
					self.elements.tooltip.animate(newPosition, posOptions.adjust.effect.duration, 'swing');
					break;

				case 'fade':
					self.elements.tooltip.hide().css(newPosition).fadeIn(posOptions.adjust.effect.duration, function(){
						// Reset opacity to avoid bugs and prevent antialias from disappearing in IE by removing filter attribute
						$(this).css({ opacity: '' });
						if($.browser.msie && $(this).get(0).style) $(this).get(0).style.removeAttribute('filter');
					});
					break;

				default:
					if(threshold === -1) self.elements.tooltip.hide();
					self.elements.tooltip.offset(newPosition); // Set new position via CSS
					if(threshold === -1) self.elements.tooltip.show();
					break;
			}

			// Call API method
			self.onPositionUpdate.call(self, event);
		}

		// Utilise jQuery UI position plugin for positioning
		self.elements.tooltip.qposition({
			of:  (event && posOptions.target === 'mouse') ? event : self.elements.target,
			my: [posOptions.corner.tooltip.x, posOptions.corner.tooltip.y],
			at: [posOptions.corner.target.x, posOptions.corner.target.y],
			offset: [posOptions.adjust.x, posOptions.adjust.y],
			by: applyPosition,
			collision: [posOptions.adjust.screen, posOptions.adjust.screen],
			ref: self
		});

		return self;
	};

	QTip.prototype.updateStyle = function(classes)
	{
		var self = this;

		// Update classes
		self.elements.tooltip.removeClass(self.options.style.classes).addClass(classes);
		self.options.style.classes = classes;

		// Update the tips and border styles
		if(self.options.style.tip.corner) tips.update.call(self);
		if(self.options.style.border) self.elements.tooltip.qcorner('update');
	}

	QTip.prototype.updateContent = function(content, reposition)
	{
		var self = this, images, loadedImages, preloaded;

		// Make sure tooltip is rendered and if not, return
		if(!self.rendered) return false;

		// Make sure content is defined before update
		else if(!content) return false;

		// Call API method and if return value is false, halt
		returned = self.beforeContentUpdate.call(self, content);
		if(typeof returned === 'string') content = returned;
		else if(returned === false) return;

		// Append new content if its a DOM array and show it if hidden
		if(content.jquery && content.length > 0)
		{
			if(self.options.content.clone === true)
				self.elements.content.html( content.clone(true).removeAttr('id').css({ display: 'block' }) );
			else
				self.elements.content.append(content.css({ display: 'block' }));
		}

		// Content is a regular string, insert the new content
		else self.elements.content.html(content);

		// Show the tooltip if rendering is taking place
		if(self.rendered < 0)
		{
			if(self.options.show.ready) self.show(null, self.options.show.ready);
			else if(self.rendered === -2) self.show();

			// Set rendered status to true
			self.rendered = true;
		}

		// Define afterLoad method
		function afterLoad()
		{
			// Update the tooltip width
			updateWidth.call(self);

			// If repositioning is enabled, update positions
			if(reposition !== false)
			{
				// Update positions
				self.updatePosition(self.cache.mouse, Boolean(self.rendered));
				tips.position.call(self);
			}

			// Call API method
			self.onContentUpdate.call(self);
			return false;
		}

		// Check if images need to be loaded before position is updated to prevent mis-positioning
		loadedImages = 0; images = self.elements.content.find('img');
		if(images.length)
		{
			if($.fn.qtip.preload)
			{
				images.each(function()
				{
					// Use preloaded image dimensions to prevent incorrect positioning
					preloaded = $('body > img[src="'+$(this).attr('src')+'"]:first');
					if(preloaded.length > 0) $(this).attr('width', preloaded.innerWidth()).attr('height', preloaded.innerHeight());
				});
				afterLoad();
			}

			// Make sure all iamges are loaded before proceeding with position update
			else images.bind('load error', function() { if(++loadedImages === images.length) afterLoad(); });
		}
		else afterLoad();

		return self;
	};

	QTip.prototype.loadContent = function(url, data, method, ajax, reposition)
	{
		var self = this, returned, request;

		// Make sure tooltip is rendered and if not, return
		if(!self.rendered) return false;

		// Call API method and if return value is false, halt
		if(self.beforeContentLoad.call(self) === false) return self;

		// Define success and error handlers
		function setupContent(content, status)
		{
			// Call user-defined success handler if present
			if(request.extended && $.isFunction(request.extended.success) && request.extended.success(content, status) === false) return;

			// Call API method and if return value is false, halt
			returned = self.onContentLoad.call(self, content);
			if(typeof returned === 'string') content = returned;

			// Update content
			self.updateContent(content, reposition);
		}
		function errorHandler(xhr, status, error)
		{
			// Call user-defined error handler if present
			if(request.extended && $.isFunction(request.extended.error) && request.extended.error(xhr,status,error) === false) return;

			// Update tooltip content to indicate error
			self.updateContent($.fn.qtip.constants.AJAX_ERROR, reposition);
		}

		// Setup $.ajax option object and process the requeqst
		request = $.extend({}, ajax, { url: url, type: method, data: data, extended: ajax, success: setupContent, error: errorHandler });
		$.ajax(request);

		return self;
	};

	QTip.prototype.updateTitle = function(content)
	{
		var self = this;

		// Make sure tooltip is rendered and if not, return
		if(!self.rendered) return false;

		// Make sure content is defined before update
		if(!content) return false;

		// Call API method and if return value is false, halt
		if(self.beforeTitleUpdate.call(self) === false) return self;

		// Set the new content
		self.elements.title.html(content);

		// Call API method
		self.onTitleUpdate.call(self);

		return self;
	};

	QTip.prototype.focus = function(event)
	{
		var self = this, i, api, curIndex, newIndex, elemIndex;

		// Make sure tooltip is rendered and if not, return
		if(!self.rendered) return false;

		// Set z-index variables
		curIndex = parseInt(self.elements.tooltip.css('z-index'), 10);
		newIndex = $.fn.qtip.constants.baseIndex + $('.qtip.ui-tooltip').length;

		// Only update the z-index if it has changed and tooltip is not already focused
		if(!self.elements.tooltip.hasClass('ui-state-focus') && curIndex !== newIndex)
		{
			// Call API method and if return value is false, halt
			if(self.beforeFocus.call(self, event) === false) return self;

			i = $.fn.qtip.interfaces.length; while(i--)
			{
				api = $.fn.qtip.interfaces[i];

				// Queue the animation so positions are updated correctly
				if(api && api.rendered)
				{
					// Reduce all other tooltip z-index by 1
					elemIndex = parseInt(api.elements.tooltip.css('z-index'), 10);
					if(typeof elemIndex === 'number' && elemIndex > -1) api.elements.tooltip.css({ zIndex: elemIndex - 1 });

					// Set focused status to false
					api.elements.tooltip.removeClass('ui-state-focus');
				}
			}

			// Set the new z-index and set focus status to true
			self.elements.tooltip.css({ zIndex: newIndex });
			self.elements.tooltip.addClass('ui-state-focus');

			// Call API method
			self.onFocus.call(self, event);
		}

		return self;
	};

	QTip.prototype.disable = function(state)
	{
		var self = this;

		if(state) self.elements.tooltip.addClass('ui-state-disabled');
		else self.elements.tooltip.removeClass('ui-state-disabled');

		return self;
	};

	QTip.prototype.destroy = function()
	{
		var self = this, i, interfaces;

		// Call API method and if return value is false, halt
		if(self.beforeDestroy.call(self) === false) return self;

		// Check if tooltip is rendered
		if(self.rendered)
		{
			// Remove event handlers and remove element
			self.options.show.when.target.unbind('mousemove.qtip', self.updatePosition);
			self.options.show.when.target.unbind('mouseout.qtip', self.hide);
			self.options.show.when.target.unbind(self.options.show.when.event + '.qtip');
			self.options.hide.when.target.unbind(self.options.hide.when.event + '.qtip');
			self.elements.tooltip.unbind(self.options.hide.when.event + '.qtip');
			self.elements.tooltip.unbind('mouseover.qtip', self.focus);
			self.elements.tooltip.remove();
		}

		// Tooltip isn't yet rendered, remove render event
		else self.options.show.when.target.unbind(self.options.show.when.event+'.qtip-'+self.id+'-create');

		// Remove interfaces object
		interfaces = $.fn.qtip.interfaces;
		i = interfaces.length; while(i--) if(interfaces[i] && interfaces[i].id === self.id) interfaces.splice(i, 1);
		if(!self.elements.target.qtip('interfaces')) self.elements.target.removeData('qtip');

		// Restore content if taken from an attribute tag
		if(self.cache.content.type !== false) self.elements.target.attr(self.cache.content.type, self.cache.content.text);

		// Call API method
		self.onDestroy.call(self);

		return self.elements.target;
	};

	QTip.prototype.getPosition = function()
	{
		var self = this, show, offset;

		// Make sure tooltip is rendered and if not, return
		if(!self.rendered) return false;

		show = (!self.elements.tooltip.is(':visible')) ? true : false;

		// Show and hide tooltip to make sure coordinates are returned
		if(show) self.elements.tooltip.addClass('ui-tooltip-accessible');
		offset = self.elements.tooltip.offset();
		if(show) self.elements.tooltip.removeClass('ui-tooltip-accessible');

		return offset;
	};

	QTip.prototype.getDimensions = function()
	{
		var self = this, show, dimensions;

		// Make sure tooltip is rendered and if not, return
		if(!self.rendered) return false;

		show = (!self.elements.tooltip.is(':visible')) ? true : false;

		// Show and hide tooltip to make sure dimensions are returned
		if(show) self.elements.tooltip.addClass('ui-tooltip-accessible');
		dimensions = {
			height: self.elements.tooltip.outerHeight(),
			width: self.elements.tooltip.outerWidth()
		};
		if(show) self.elements.tooltip.removeClass('ui-tooltip-accessible');

		return dimensions;
	};

	// jQuery $.fn extension method
	$.fn.qtip = function(options)
	{
		var apis, i, interfaces, command, opts;

		// Execute API command if present
		if(typeof options === 'string')
		{
			// Find all related API's
			apis = []; interfaces = $.fn.qtip.interfaces;
			i = interfaces.length; while(i--)
			{
				if(interfaces[i])
				{
					if($(this).attr('qtip') && $(this).add(interfaces[i].elements.tooltip).length === 1)
						apis.unshift(interfaces[i]);
					else if($(this).add(interfaces[i].elements.target).length === 1)
						apis.push(interfaces[i]);
				}
			}

			// API were found, return requested attribute
			if(apis.length > 0)
			{
				// Lowercase the command
				command = options.toLowerCase();

				if(command === 'id') return apis[0].id;
				else if(command === 'api') return apis[0];
				else if(command === 'interfaces') return apis;
				else
				{
					return $(this).each(function()
					{
						// Execute command on chosen qTips
						var i = apis.length; while(i--)
						{
							// Render and destroy commands don't require tooltip to be rendered
							if(command === 'render') interfaces[i].render();
							else if(command === 'destroy') interfaces[i].destroy();

							// Only call API if tooltip is rendered and it wasn't a render or destroy call
							else if(interfaces[i].rendered === true)
							{
								if(command === 'show') interfaces[i].show();
								else if(command === 'hide') interfaces[i].hide();
								else if(command === 'focus') interfaces[i].focus();
								else if(command === 'disable') interfaces[i].disable(true);
								else if(command === 'enable') interfaces[i].disable(false);
								else if(command === 'update') interfaces[i].updatePosition();
							}
						}
					});
				}
			}

			// No API's were found, no tooltips are present
			else{
				return $(this); // Return original elements as per jQuery guidelines
			}
		}

		// No API commands. validate provided options and setup qTips
		else
		{
			// Set null options object if no options are provided
			if(!options) options = {};

			// Sanitize option data
			if(typeof options.content !== 'object' || (options.content.jquery && options.content.length > 0)) options.content = { text: options.content };
			if(typeof options.content.title !== 'object') options.content.title = { text: Boolean(options.content.title) };
			if(typeof options.content.url !== 'object') options.content.url = { path: options.content.url };
			if(options.content.data){ options.content.url.data = options.content.data; delete options.content.data; }
			if(options.content.method){ options.content.url.method = options.content.method; delete options.content.method; }
			if(typeof options.position !== 'object') options.position = { corner: options.position };
			if(typeof options.position.corner !== 'object') options.position.corner = { target: options.position.corner, tooltip: options.position.corner };
			if(typeof options.position.adjust !== 'object') options.position.adjust = { };
			if(options.position.adjust.x){ options.position.adjust.x = parseInt(options.position.adjust.x, 10) || 0; }
			if(options.position.adjust.y){ options.position.adjust.y = parseInt(options.position.adjust.y, 10) || 0; }
			if(typeof options.position.adjust.effect !== 'object') options.position.adjust.effect = { type: options.position.adjust.effect };
			if(typeof options.position.adjust.effect.duration === 0) options.position.adjust.effect = { type: false };
			if(typeof options.show !== 'object') options.show = { when: options.show };
			if(typeof options.show.when !== 'object') options.show.when = { event: options.show.when };
			if(typeof options.show.effect !== 'object') options.show.effect = { type: options.show.effect };
			if(typeof options.show.effect.length === 'number') options.show.effect = { type: options.show.effect.type, duration: options.show.effect.length };
			if(typeof options.show.effect.duration === 0) options.show.effect = { type: false };
			if(typeof options.hide !== 'object') options.hide = { when: options.hide };
			if(typeof options.hide.when !== 'object') options.hide.when = { event: options.hide.when };
			if(typeof options.hide.effect !== 'object') options.hide.effect = { type: options.hide.effect };
			if(typeof options.hide.effect.length === 'number') options.hide.effect = { type: options.hide.effect.type, duration: options.hide.effect.length };
			if(typeof options.hide.effect.duration === 0) options.hide.effect = { type: false };
			if(typeof options.style !== 'object') options.style = { name: options.style };
			if(typeof options.style.tip !== 'object') options.style.tip = { corner: options.style.tip };
			if(typeof options.style.classes !== 'string') delete options.style.classes;

			// Build main options object
			opts = $.extend(true, {}, $.fn.qtip.defaults, options);
			if(opts.style.tip.corner === true) opts.style.tip.corner = (opts.position.corner.tooltip === 'center') ? false : opts.position.corner.tooltip;
			if(opts.position.adjust.screen === true) opts.position.adjust.screen = 'flip';
			else if(String(opts.position.adjust.screen).search(/flip|fit/) < 0) opts.position.adjust.screen = 'none';

			// Preload images if preload plugin is present
			if($.fn.qtip.preload) $.fn.qtip.preload(opts.content.text);

			// Iterate each matched element
			return $(this).each(function(cur) // Return original elements as per jQuery guidelines
			{
				var id, i, interfaces, self, attribute, api, targets, events, namespace;

				// If element already has a qTip and it's exclusive, destroy it
				id = $(this).qtip('api');
				if(id.options && id.options.exclusive) $(this).qtip('destroy');

				// Find next available ID, or use custom ID if provided
				if(typeof opts.id === 'string' && opts.id.length > 0 && Boolean(opts.id) !== false)
				{
					interfaces = $.fn.qtip.interfaces; i = interfaces.length;
					while(i--)  if(interfaces[i].id === opts.id) delete opts.id;
				}
				id = opts.id || $.fn.qtip.nextid++;

				// Initialize the qTip
				self = _init.call($(this), id, opts);

				// Remove title and alt attributes to prevent default tooltip
				if(typeof self.options.content.text !== 'string' && !self.options.content.text.jquery)
				{
					attribute = $(this).attr('title') ? 'title' : 'alt';
					if($(this).attr(attribute))
					{
						// Setup content cache and remove attribute
						self.cache.content = { type: attribute, text: $(this).attr(attribute) };
						self.options.content.text = self.cache.content.text.replace("\\n/g", '<br />');
						$(this).removeAttr(attribute);
					}

					// Attempt to find the cached content in first created tooltip
					else
					{
						api = $(this).qtip('interfaces'); api = api[api.length-1];
						if(api && api.cache && api.cache.content.type !== false) self.options.content.text = api.options.content.text;
					}
				}

				// Determine hide and show targets
				targets = { show: self.options.show.when.target, hide: self.options.hide.when.target };
				events = {
					show: self.options.show.when.event,
					hide: (String(self.options.hide.when.event).search(/(inactive|unfocus)/i) > -1) ? 'mouseout' : self.options.hide.when.event
				};

				// If prerendering is disabled, create tooltip on show event
				if(self.options.content.prerender === false && self.options.show.ready !== true && self.options.show.when.event !== false)
				{
					// Setup temporary events namespace
					namespace = '.qtip-'+id+'-create';

					// Bind defined show event to show target to construct and show the tooltip
					targets.show.bind(events.show+namespace, { id: id }, function(event)
					{
						// Cache the mouse data and start the event sequence
						var mouse = { left: event.pageX, top: event.pageY };
						self.timers.show = setTimeout(function()
						{
							// Cache mouse coords,render and render the tooltip
							cacheMouse.call(self, mouse);
							self.render(true);

							// Unbind show and hide event
							targets.show.unbind(events.show+'.qtip-'+self.id+'-create');
							targets.hide.unbind(events.hide+'.qtip-'+self.id+'-create');
						},
						self.options.show.delay);
					});

					// If hide and show targets and events aren't identical, bind hide event to reset show timer
					if(targets.show !== targets.hide && self.options.show.when.event !== self.options.hide.when.event)
						targets.hide.bind(events.hide+namespace, function(event){ clearTimeout(self.timers.show); });
				}

				// Prerendering is enabled. Set mouse position cache and render qTip
				else{ cacheMouse.call(self, targets.show.offset()); self.render(false); }
			});
		}
	};

	// Setup global qTip object properties
	$.fn.qtip.nextid = 0;
	$.fn.qtip.interfaces = [];

	// Setup cache
	$.fn.qtip.cache = {
		content: {},
		scroll: { left: 0, top: 0 }
	};

	// Setup event handlers on document ready as per jQuery guidelines
	$(function()
	{
		// Adjust positions of the tooltips on window resize or scroll if enabled
		$(window).bind('resize.qtip scroll.qtip', function(event)
		{
			var i, api;

			// Read just cached scroll values
			if(event.type === 'scroll') $.fn.qtip.cache.scroll = { left: $(window).scrollLeft(), top: $(window).scrollTop() };

			i = $.fn.qtip.interfaces.length; while(i--)
			{
				// Access current elements API
				api = $.fn.qtip.interfaces[i];

				// Queue the animation so positions are updated correctly
				if(api && api.rendered && api.elements.tooltip.is(':visible') &&
				( (api.options.position.adjust.scroll && event.type === 'scroll') || (api.options.position.adjust.resize && event.type === 'resize') )
				)
					api.updatePosition(event);
			}
		})
		.trigger('scroll');

		// Hide unfocus toolips on document mousedown
		$(document).bind('mousedown.qtip', function(event)
		{
			var i, api;

			if($(event.target).parents('div.qtip').length === 0)
			{
				i = $.fn.qtip.interfaces.length; while(i--)
				{
					api = $.fn.qtip.interfaces[i];

					if(api && $(event.target).add(api.elements.target).length > 1
					&& api.rendered && api.elements.tooltip.is(':visible')
					&& api.options.hide.when.event === 'unfocus' && !api.elements.tooltip.hasClass('ui-state-disabled')
					)
						api.hide(event);
				}
			}
		});
	});

	// Define configuration defaults
	$.fn.qtip.constants = { baseIndex: 6000 };
	$.fn.qtip.defaults = {
		id: false,
		exclusive: true,

		// Content
		content: {
			prerender: false,
			text: false,
			clone: true,
			url: {
				path: false,
				data: null,
				method: 'GET',
				once: true
			},
			title: {
				text: false,
				button: false
			}
		},
		// Position
		position: {
			target: false,
			corner: {
				target: 'bottomRight',
				tooltip: 'topLeft'
			},
			adjust: {
				x: 0, y: 0,
				mouse: true,
				screen: false,
				scroll: true,
				resize: true,
				effect: {
					type: 'slide',
					duration: 120,
					threshold: 450
				}
			},
			type: 'absolute',
			container: false
		},
		// Effects
		show: {
			when: {
				target: false,
				event: 'mouseover'
			},
			effect: {
				type: 'fade',
				duration: 100
			},
			delay: 140,
			solo: false,
			ready: false
		},
		hide: {
			when: {
				target: false,
				event: 'mouseout'
			},
			effect: {
				type: 'fade',
				duration: 100
			},
			delay: 0,
			fixed: false
		},
		style: {
			tip: {
				corner: false,
				type: false
			},
			border: false,
			classes: ''
		},
		// Callbacks
		api: {
			beforeRender: function(){},
			onRender: function(){},
			beforePositionUpdate: function(){},
			onPositionUpdate: function(){},
			beforeShow: function(){},
			onShow: function(){},
			beforeHide: function(){},
			onHide: function(){},
			beforeContentUpdate: function(){},
			onContentUpdate: function(){},
			beforeContentLoad: function(){},
			onContentLoad: function(){},
			beforeTitleUpdate: function(){},
			onTitleUpdate: function(){},
			beforeDestroy: function(){},
			onDestroy: function(){},
			beforeFocus: function(){},
			onFocus: function(){}
		}
	};

	/*
	* jQuery UI Position - qTip Modification
	*
	* Original code gathered from http://docs.jquery.com/UI/Position
	* and modified to suit the style and usage cases of qTip.
	*
	* Copyright (c) 2009 AUTHORS.txt (http://jqueryui.com/about)
	* Dual licensed under the MIT (MIT-LICENSE.txt)
	* and GPL (GPL-LICENSE.txt) licenses.
	*
	* http://docs.jquery.com/UI/Position
	*/
	$.fn.qposition = function(options)
	{
		var self = this,
			target = $(options.of),
			collision = options.collision,
			offset = options.offset,
			targetWidth,
			targetHeight,
			basePosition,
			imagemap,
			mouseAdjust = { x: 6, y: 6 };

		self.fit = {
			left: function(position, data)
			{
				var over = position.left + data.elemWidth - $(window).width() - $(window).scrollLeft();
				position.left = over > 0 ? position.left - over : Math.max(0, position.left);
				return true;
			},
			top: function(position, data)
			{
				var over = position.top + data.elemHeight - $(window).height() - $(window).scrollTop();
				position.top = over > 0 ? position.top - over : Math.max(0, position.top);
				return true;
			}
		};

		self.flip = {
			left: function(position, data)
			{
				var over = position.left + data.elemWidth - $(window).width() - $(window).scrollLeft(),
					myOffset = data.my[0] === 'left' ? -data.elemWidth : data.my[0] === 'right' ? data.elemWidth : 0,
					offset = -2 * data.offset[0],
					beforePos = parseInt(position.left, 10);

				position.left += position.left < 0 ? myOffset + data.targetWidth + offset : over > 0 ? myOffset - data.targetWidth + offset : 0;
				return beforePos !== position.left;
			},
			top: function(position, data)
			{
				var over = position.top + data.elemHeight - $(window).height() - $(window).scrollTop(),
					myOffset = data.my[1] === 'top' ? -data.elemHeight : data.my[1] === 'bottom' ? data.elemHeight : 0,
					atOffset = data.at[1] === 'top' ? data.targetHeight : data.at[1] === 'bottom' ? -data.targetHeight : 0,
					offset = -2 * data.offset[1],
					beforePos = parseInt(position.top, 10);

				position.top += position.top < 0 ? myOffset + data.targetHeight + offset : over > 0 ? myOffset + atOffset + offset : 0;
				return beforePos !== position.top;
			}
		};

		if(options.of === document)
		{
			targetWidth = target.width();
			targetHeight = target.height();
			basePosition = { top: 0, left: 0 };
		}
		else if(options.of === window)
		{
			targetWidth = target.width();
			targetHeight = target.height();
			basePosition = { top: target.scrollTop(), left: target.scrollLeft() };
		}
		else if($(options.of).is('area') === true && $.fn.qtip.imagemap)
		{
			imagemap = $.fn.qtip.imagemap.getPosition.call(options.ref, target);
			targetWidth = imagemap.size.width;
			targetHeight = imagemap.size.height;
			basePosition = imagemap.position;
		}
		else if(options.of.preventDefault)
		{
			// Force left top to allow flipping
			options.at = ['left', 'top'];
			targetWidth = targetHeight = 0;
			basePosition = { top: options.of.pageY, left: options.of.pageX };
		}
		else
		{
			targetWidth = target.outerWidth();
			targetHeight = target.outerHeight();
			basePosition = target.offset();
		}

		switch(options.at[0])
		{
			case 'right':
				basePosition.left += targetWidth;
				break;

			case 'center':
				basePosition.left += targetWidth / 2;
				break;
		}

		switch(options.at[1])
		{
			case 'bottom':
				basePosition.top += targetHeight;
				break;

			case 'center':
				basePosition.top += targetHeight / 2;
				break;
		}

		basePosition.left += offset[0];
		basePosition.top += offset[1];

		return this.each(function()
		{
			var elem = $(this),
				elemWidth = elem.outerWidth(),
				elemHeight = elem.outerHeight(),
				position = $.extend({}, basePosition),
				config,
				adjust;

			switch(options.my[0])
			{
				case 'right':
					position.left -= elemWidth;
					break;

				case 'center':
					position.left -= elemWidth / 2;
					break;
			}

			switch(options.my[1])
			{
				case 'bottom':
					position.top -= elemHeight;
					break;

				case 'center':
					position.top -= elemHeight / 2;
					break;
			}

			config = {
				targetWidth: targetWidth,
				targetHeight: targetHeight,
				elemWidth: elemWidth,
				elemHeight: elemHeight,
				offset: offset,
				my: options.my,
				at: options.at
			};

			// Update with collision detection if enabled
			adjust = { top: position.top, left: position.left };
			if(collision[0] !== 'none') self[collision[0]].left(position, config);
			if(collision[1] !== 'none') self[collision[1]].top(position, config);

			// Calculate collision offset values
			adjust = { left: Math.abs(position.left - adjust.left), top: Math.abs(position.top - adjust.top) };

			// Adjust mouse offset to prevent tooltip overlapping
			if(options.of.preventDefault)
			{
				if(adjust.top) mouseAdjust.y = -mouseAdjust.y;
				if(adjust.left) mouseAdjust.x = -mouseAdjust.x;
				position.top -= options.my[1] === 'bottom' ? mouseAdjust.y : -mouseAdjust.y;
				position.left -= options.my[0] === 'right' ? mouseAdjust.x : -mouseAdjust.x;
			}

			// Execute callback method with new position and adjustment variables
			options.by.call(this, position, adjust);
		});
	};

	// the following functionality is planned for jQuery 1.4
	// based on http://plugins.jquery.com/files/offset.js.txt
	jQuery.fn.extend({
		fnOffset: $.fn.offset,
		offset: function(newOffset)
		{
			return !newOffset ? this.fnOffset() : this.each(function() {
				var elem = $(this),
					// we need to convert static positioning to relative positioning
					isRelative = /relative|static/.test(elem.css('position')),
					hide = elem.css('display') === 'none',
					offset, delta;

				if(isRelative) elem.css('position', 'relative');
				if(hide) elem.show();

				offset = elem.offset();
				delta = {
					left : parseInt(elem.css('left'), 10),
					top: parseInt(elem.css('top'), 10)
				};

				// in case of 'auto'
				delta.left = !isNaN(delta.left)
					? delta.left
					: isRelative
						? 0
						: this.offsetLeft;
				delta.top = !isNaN(delta.top)
					? delta.top
					: isRelative
						? 0
						: this.offsetTop;

				// allow setting only left or only top
				if(newOffset.left || newOffset.left === 0)
					elem.css('left', newOffset.left - offset.left + delta.left);

				if(newOffset.top || newOffset.top === 0)
					elem.css('top', newOffset.top - offset.top + delta.top);

				if(hide) elem.hide();
			});
		}
	});


	/*!
	* qTip speech bubble tips component - Now part of core (again!)
	*
	* Copyright (c) 2009 Craig Thompson
	* http://craigsworks.com
	*
	* Licensed under MIT
	* http://www.opensource.org/licenses/mit-license.php
	*/
	tips = {
		create: function(corner)
		{
			var self = this, color, coordinates, center, coordsize, path;

			// Setup color, type and corner values
			if(self.options.style.tip.corner === false) return;
			corner = corner || self.options.style.tip.corner;
			type = self.options.style.tip.type || corner;

			// Destroy previous tip, if there is one
			if(self.elements.tip) self.elements.tip.remove();

			// Create tip element
			self.elements.tip = $('<div class="ui-tooltip-tip ui-widget-content"></div>').prependTo(self.elements.tooltip);

			// Calculate tip size
			self.elements.tooltip.addClass('ui-tooltip-accessible');
			self.options.style.tip.size = size = { width: self.elements.tip.width(), height: self.elements.tip.height() }
			self.elements.tooltip.removeClass('ui-tooltip-accessible');

			// Calculate tip coordinates and determine if polygonal CSS can be used
			coordinates = tips.calculate(type.toString(), size.width, size.height);
			center = (corner.x === 'center' || corner.y === 'center');

			// Use canvas element if supported
			if(!$.browser.mozilla && $('<canvas/>').get(0).getContext && center)
			{
				// Create the canvas element
				self.elements.tip.append('<canvas height="'+size.height+'" width="'+size.width+'"></canvas>');
			}

			// Canvas not supported - Use VML (IE)
			else if($.browser.msie)
			{
				// Create coordize and tip path using tip coordinates
				coordsize = size.width + ',' + size.height;
				path = 'm' + coordinates[0][0] + ',' + coordinates[0][1] +
					' l' + coordinates[1][0] + ',' + coordinates[1][1] +
					' ' + coordinates[2][0] + ',' + coordinates[2][1] +
					' xe';

				// Create VML element and a phantom image (IE won't show the last created VML element otherwise)
				self.elements.tip.append('<vml:shape path="'+path+'" coordsize="'+coordsize+'"  stroked="false"' +
					' style="width:'+size.width+'px; height:'+size.height+'px; vertical-align:'+corner.y+';"></vml:shape>');
			}

			// No canvas or VML support, use CSS tips instead
			else
			{
				self.elements.tip.addClass('ui-tooltip-tip-'+corner.toString()).append('<div class="ui-tooltip-tip-inner"></div>')
			}


			// Cache tip position
			if(!self.cache.tip) self.cache.tip = {};
			self.cache.tip.user = corner;

			// Set new position
			tips.update.call(self);
			tips.position.call(self, corner);
		},

		position: function(corner)
		{
			var self = this, corners, adjust,
				borderAdjust = this.options.style.border.radius || 0,
				ieAdjust = { left: 0, right: 0, top: 0, bottom: 0 };

			// Return if tips are disabled or tip is not yet rendered
			if(self.options.style.tip.corner === false || !self.elements.tip){ return false; }
			else if(!corner){ corner = self.cache.tip.last; }

			// Set initial position
			self.elements.tip.css(corner.x, 0).css(corner.y, 0);

			// Setup corners to be adjusted
			corners = ['left', 'right'];
			corners[ (corner.precedance === 'y') ? 'push' : 'unshift' ]('top', 'bottom');

			// Setup adjustments
			adjust = parseWidth(self.elements.tooltip.css('border-'+corners[0]+'-width'));
			if($.browser.msie)
			{
				ieAdjust = {
					left: 1, top: 1,
					right: (corner.precedance === 'y') ? 1 : 2,
					bottom: (corner.precedance === 'x') ? 1 : 2
				};
			}

			// Adjust primary corners
			switch(corner[ corner.precedance === 'y' ? 'x' : 'y' ])
			{
				case 'center':
					self.elements.tip
						.css(corners[0], '50%')
						.css('margin-'+corners[0], -(self.options.style.tip.size[ (corner.precedance === 'y') ? 'width' : 'height' ] / 2) + corner.offset[ corners[0] ] );
					break;

				case corners[0]:
					self.elements.tip.css(corners[0], corner.offset.left - ieAdjust[ corners[0] ] - adjust + borderAdjust);
					break;

				case corners[1]:
					self.elements.tip.css(corners[1], corner.offset.left + ieAdjust[ corners[1] ] - adjust + borderAdjust);
					break;
			}

			// Adjust secondary corners
			adjust += self.options.style.tip.size[ (corner.precedance === 'y') ? 'width' : 'height' ];
			if(corner[corner.precedance] === corners[2])
				self.elements.tip.css(corners[2], corner.offset[ corners[2] ] - ieAdjust[ corners[2] ] - adjust);
			else
				self.elements.tip.css(corners[3], corner.offset[ corners[2] ] + ieAdjust[ corners[3] ] - adjust);

			// Cache used tip value
			self.cache.tip.last = corner;
		},

		update: function()
		{
			var self = this, center, color, context, coordinates,
				style = self.options.style.tip, tip = self.cache.tip.user,
				inner, toSet, regular, transparent;

			// Determine if an antialiased 'middle' tip needs to be created
			center = (tip.x === 'center' || tip.y === 'center');

			// Detect new tip colour and reset background to transparent
			color = self.elements.tip.css('background-color', '').css('background-color');
			style.color = (color === 'transparent') ? self.elements.tooltip.css('border-top-color') : color;
			self.elements.tip.css('background-color', 'transparent');

			if(!$.browser.mozilla && $('<canvas/>').get(0).getContext && center)
			{
				// Grab tip coordinates
				coordinates = tips.calculate.call(self, self.cache.tip.user, style.size.width, style.size.height);

				// Setup canvas properties
				context = self.elements.tip.find('canvas').get(0).getContext('2d');
				context.fillStyle = style.color;
				context.miterLimit = 0;

				// Draw the canvas tip (Delayed til after DOM creation)
				context.clearRect(0,0,3000,3000);
				context.beginPath();
				context.moveTo(coordinates[0][0], coordinates[0][1]);
				context.lineTo(coordinates[1][0], coordinates[1][1]);
				context.lineTo(coordinates[2][0], coordinates[2][1]);
				context.closePath();
				context.fill();
			}

			else if($.browser.msie)
			{
				// Set new fillcolor attribute
				self.elements.tooltip.find('.ui-tooltip-tip [nodeName="shape"]').attr('fillcolor', style.color);
			}

			else
			{
				// Setup border style strings
				regular = 'px solid ' + style.color;
				transparent = 'px solid transparent';

				// Setup inner element and initial border
				inner = self.elements.tip.children(':first');

				// Determine what border corners to set
				toSet = {
					x: tip.precedance === 'x' ? (tip.x === 'left' ? 'right' : 'left') : tip.x,
					y: tip.precedance === 'y' ? (tip.y === 'top' ? 'bottom' : 'top') : tip.y
				};

				// Setup borders based on corner values
				if(tip.x === 'center')
				{
					inner.css({
						borderLeft: (style.size.width / 2) + transparent,
						borderRight: (style.size.width / 2) + transparent
					})
					.css('border-'+toSet.y, style.size.height + regular);
				}
				else if(tip.y === 'center')
				{
					inner.css({
						borderTop: (style.size.height / 2) + transparent,
						borderBottom: (style.size.height / 2) + transparent
					})
					.css('border-'+toSet.x, style.size.width + regular);
				}
				else
				{
					inner.css('border-width', (style.size.height / 2) + 'px ' + (style.size.width / 2) + 'px')
					.css('border-' + toSet.x, (style.size.width / 2) + regular)
					.css('border-' + toSet.y, (style.size.height / 2) + regular)
				}
			}
		},

		// Tip coordinates calculator
		calculate: function(corner, width, height)
		{
			// Define tip coordinates in terms of height and width values
			var tips = {
				bottomright:	[[0,0],				[width,height],		[width,0]],
				bottomleft:		[[0,0],				[width,0],				[0,height]],
				topright:		[[0,height],		[width,0],				[width,height]],
				topleft:			[[0,0],				[0,height],			 	[width,height]],
				topcenter:		[[0,height],		[width / 2,0],		 	[width,height]],
				bottomcenter:  [[0,0],				[width,0],			  	[width / 2,height]],
				rightcenter:	[[0,0],				[width,height / 2],  [0,height]],
				leftcenter:		[[width,0],			[width,height],		[0,height / 2]]
			};
			tips.lefttop = tips.bottomright; tips.righttop = tips.bottomleft;
			tips.leftbottom = tips.topright; tips.rightbottom = tips.topleft;

			return tips[corner];
		}
	};
})(jQuery);

