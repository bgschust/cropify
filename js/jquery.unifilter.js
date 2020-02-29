/*
 * UniFilter - jQuery Plugin for Sorting, Searching and Filtering
 * http://plugins.gravitysign.com/unifilter
 * Copyright (c) 2018 Roman Yurchuk
 * Version 3.0
*/


(function($, undefined){

	"use strict";
	
	
	/**
		Define "UniFilter" class 
	*/
	
	function UniFilter (container, list, options){
		this.container = $(container);
		this.options = options;
		this.list = $(list);
		this.items = this.list.children(options.selector);
		this.filters = {};
		this.search = {};
		this.range = {};
		this.sort = null;
		this.data = [];
		this.init();
	}
	
	
	/**
	 	Method to get vendor specific CSS3 property name
	*/
	
	UniFilter.prototype.getCSS3Property = function(name){
		var prefix = ['Webkit','Moz','O','ms'];	
		var style = document.createElement('div').style;
		if(style[name] === '') {
			return name;
		} else {
			var ucname = name.charAt(0).toUpperCase() + name.substr(1);
			for(var p in prefix) {
				if(style[prefix[p] + ucname] === '') {
					return prefix[p] + ucname;
				}
			}
		}
		return undefined;
	};
	
	
	/**
	 	Method to get vendor specific CSS3 event name
	*/
	
	UniFilter.prototype.getCSS3Event = function(){
		var events = {
			'WebkitTransition': 'webkitTransitionEnd',
			'MozTransition': 'transitionend',
			'OTransition': 'oTransitionEnd otransitionend',
			'transition': 'transitionend'
		};	
		return events[this.getCSS3Property('transition')];
	};
	
	
	/**
		Init
	*/
	
	UniFilter.prototype.init = function(){
			
		// unifilter object
		var that = this;
		
		// add uf-list class to the grid
		this.list.addClass('uf-list');
	
		// add uf-item class to all items
		this.items.addClass('uf-item').each(function(n){
			that.data.push({
				item: this,
				index: n,
				display: true,
				filters: that.getItemFilters(this),
				search: that.getItemSearch(this),
				sort: that.getItemSort(this),
				range: that.getItemRange(this),
				filters_match: 0,
				search_match: 0,
				range_match: 0
			});
		});
					
		// get leading filters for "bestmatch" option
		this.leading_filters = this.getLeadingFilters();
		
		// order in which to display search, sort and filters in 
		// unifilter container
		var order = this.options.order.trim().split(/\s*,\s*/);
		order.forEach(function(entry){
			switch(entry) {
				case "filters":
					if(that.options.filters) {
						that.displayFilters();
						that.addFilterEvents();
						window.setTimeout(function(){
							that.addDeepLinking();
						}, 50);
					}
					break;
				case "search" :
					if(that.options.search) {
						that.displaySearch();
						that.addSearchEvents();
					}
					break;
				case "sort":
					if(that.options.sort) {
						that.displaySort();
						that.addSortEvents();
					}
					break;
				case "range":
					if(that.options.range) {
						that.displayRange();
						that.addRangeEvents();
					}
			}
		});
						
		// stop auto scroll if user scrolls page after selecting a filter
		if(this.options.autoScroll) {
			$(window).on('scroll.unifilter', function(){
				window.clearTimeout(that.scrollTimer);
			});
		}
		
	};

	
	
	/**
		Method to get filter tags for single item in list
	*/
	
	UniFilter.prototype.getItemFilters = function(item) {
			var filter_tags = {};
			
			// if filters are not set in options, return null
			if(!this.options.filters) { return null; }
				
			// get filter tags assigned to items for every filter in options
			for(var filter_name in this.options.filters) {
				var data, filter = this.options.filters[filter_name];
				filter_tags[filter_name] = [];
					
				// check if custom function to retrieve filter tags is set
				if(filter.getFilterData && typeof filter.getFilterData === "function") {
					data = filter.getFilterData.call(item, filter_name);
					if(Array.isArray(data)) {
						filter_tags[filter_name] = data;
					}
				} else {
					data = $(item).data(filter_name);
					if(data && data.length) {
						filter_tags[filter_name] = data.split(/\s*,\s*/);
					}
				}
				
			}
			
			return filter_tags;
	};
	
	
	/** 
		Method to get unique tags for all filters
	*/
	
	UniFilter.prototype.uniqueFilterTags = function(){
		var tags = {};
	
		// loop filters in options
		for(var filter_name in this.options.filters) {
			var all_tags = [], unique_tags = [];
		
			// loop items data and pull filters tags for specific filter
			for(var i = 0; i < this.data.length; i++) {
				all_tags = all_tags.concat(this.data[i].filters[filter_name]);
			}
			
			// filter tags array and get only unique tags
			while(all_tags.length) {
				var tag = all_tags.pop();
				if(unique_tags.indexOf(tag) === -1 && tag !== '') {
					unique_tags.push(tag);
				}
			}
			
			// run callback to rearange filter tags in some order
			var filter_options = this.options.filters[filter_name];
			if(typeof filter_options.sortFilterTags === 'function') {
				unique_tags = filter_options.sortFilterTags(unique_tags);
			}
			// save tags
			tags[filter_name] = unique_tags;
		}
						
		return tags;
	};
	
	
	/**
		Method to calculate total number of items for specific filter tag
	*/
	
	UniFilter.prototype.getFilterNumItems = function(filter, tag){
		if(this.options.filters[filter]) {
			var n = 0; 
			for(var i = 0; i < this.data.length; i++) {
				if(this.data[i].filters[filter].indexOf(tag) !== -1) {
					n++;
				}
			}
			return n;
		} else {
			return 0;
		}
		
	};
	
	
	/** 
		Method to display filters in container
	*/
	
	UniFilter.prototype.displayFilters = function(){
			
		// get unique filter tags for items
		var filter_tags = this.uniqueFilterTags();
		
		// container for all filters
		var markup = $('<div class="uf-filter-wrap"></div>');
						
		// loop filters 
		for(var filter_name in this.options.filters) {
			var filter_option = this.options.filters[filter_name];
			
			// display html for filter if there is at least one filter tag
			if(filter_option.display && filter_tags[filter_name].length) {
			
				var filter_markup = $('<div id="uf-' + filter_name + '" class="uf-filter"></div>');
				
				// add filter title & subtitle
				if(filter_option.title) {
					var title = $('<div class="uf-title">' + filter_option.title + '</div>');
					if(filter_option.subtitle) {
						title.append('<span>' + filter_option.subtitle + '</span>');
					}
					filter_markup.append(title);
				}
				
				// insert filter tags
				var tags_markup = $('<div class="uf-tags"></div>');
				for(var i = 0; i < filter_tags[filter_name].length; i++) {
					var tag = filter_tags[filter_name][i];
					var tag_markup = $('<div><a href="#' + tag + '">' + tag + '</a></div>');
					if(filter_option.tooltip) {
						tag_markup.append('<span class="uf-tooltip">' + 
						this.getFilterNumItems(filter_name, tag) + '</span>');
					}					
					tags_markup.append(tag_markup);
				}
				
				// add reset as last element
				tags_markup.append('<div class="uf-reset" title="Reset filters"></div>');
								
				// add tags to the filter markup
				filter_markup.append(tags_markup);
				
				// add filter to container
				markup.append(filter_markup);
							
			}
					
		}
		
		// now add whole markup to container
		this.container.append(markup);	
			
	};
	
	
	/**
		Method to display search fields in container
	*/
	
	UniFilter.prototype.displaySearch = function(){
					
		// container for all search fields
		var markup = $('<div class="uf-search-wrap"></div>');
		
		// loop all search options
		for(var search in this.options.search) {
			var search_option = this.options.search[search];
				
				// check if search option should be displayed
				if(search_option.display) {
				
					var search_markup = $('<div id="uf-' + search + '" class="uf-search"></div>');
					
					// add title & subtitle
					if(search_option.title) {
						var title = $('<div class="uf-title">' + search_option.title + '</div>');
						if(search_option.subtitle) {
							title.append('<span>' + search_option.subtitle + '</span>');
						}
						search_markup.append(title);
					}
					
					// add input wrap
					$('<div class="uf-search-box"></div>').
					append('<input type="search" placeholder="' + search_option.placeholder + '"/>').
					append('<div class="uf-reset" title="Reset"></div>').appendTo(search_markup);
					
					// add search to wrapper
					markup.append(search_markup);
				
				}
		}
		
		// add search to container
		this.container.append(markup);
	
	};
	
	
	/**
		Method to display sort box with options
	*/
	
	UniFilter.prototype.displaySort = function(){
	
		// sort option
		var sort_option = this.options.sort;
		
		// return if sort option should not be displayed
		if(!sort_option.display) { return; }
			
		// start markup
		var markup = $('<div class="uf-sort-wrap"><div class="uf-sort"></div></div>');
		
		// add title & subtitle
		if(sort_option.title) {
			var title = $('<div class="uf-title">' + sort_option.title + '</div>');
			if(sort_option.subtitle) {
				title.append('<span>' + sort_option.subtitle + '</span>');
			}
			markup.find('.uf-sort').append(title);
		}
		
		// sortbox markup
		var sortbox_markup = $('<div class="uf-sort-box">' + 
		'<div class="uf-select"><span>' + sort_option.placeholder + ' &hellip;</span>' + 
		'<a class="uf-order" href="#" title="Reverse sorting order"></a></div></div>');
				
		// loop sort options
		var options_markup = $('<div class="uf-options"></div>');
		for(var option_name in sort_option.options) {
			var option = sort_option.options[option_name];
			options_markup.append('<div><a href="#' + option_name + '">' + 
			(option.label ? option.label : option_name) + '</a></li>');
		}
		
		// append none option for no sotring
		options_markup.append('<div><a href="" title="Click to reset sorting">None</a></div>');
		
		// put everything together and add to container
		sortbox_markup.append(options_markup);
		markup.find('.uf-sort').append(sortbox_markup);
		this.container.append(markup);		
	
	};
	
	
	/**
		Method to display range select
	*/
	
	UniFilter.prototype.displayRange = function(){
		
		// contauner for all range select elements
		var markup = $('<div class="uf-range-wrap"></div>');
 		
		// loop ranges in configuration
		for(var range_name in this.options.range){
			var range_option = this.options.range[range_name];
			
			// check if range option should be displayed
			if(range_option.display && range_option.scale) {
					
					// range select element
					var range_markup = $('<div id="uf-' + range_name + '" class="uf-range"></div>');
					
					// add title and subtitle
					if(range_option.title) {
						var title = $('<div class="uf-title">' + range_option.title + '</div>');
						if(range_option.subtitle) {
							title.append('<span>' + range_option.subtitle + '</span>');
						}
						range_markup.append(title);
					}
					
					// get min-max range scale values
					var scale = range_option.scale.replace(/[^\d-\.]+/g, '').split('-');			
					var slider_markup = $('<div class="uf-slider">' +
						'<div class="uf-path">' +
							'<a href="#" class="uf-handle-left">' +
								'<span class="uf-tooltip">' + 
									range_option.prefix + Number(scale[0]).toFixed(range_option.precision) + 
								'</span>' +
							'</a>' +
							'<a href="#" class="uf-handle-right">' +
								'<span class="uf-tooltip">' + 
									range_option.prefix + Number(scale[1]).toFixed(range_option.precision) + 
								'</span>' +
							'</a>' +
						'</div>' +
						'<span class="uf-start">'+ range_option.prefix + 
							Number(scale[0]).toFixed(range_option.precision) +'</span>' +
						'<span class="uf-end">'+ range_option.prefix + 
							Number(scale[1]).toFixed(range_option.precision) +'</span>' +
					'</div>');
				
				// add slider
				range_markup.append(slider_markup);
				
				// add range
				markup.append(range_markup);
			
			}
		}
		
		// add range markup to the container
		this.container.append(markup);
		
	};
	
	
	/**
		Add events to the sort box
	*/
	
	UniFilter.prototype.addSortEvents = function(){
	
		// UniFilter object
		var that = this;
		
		// ref to some DOM elements
		var sortbox = $('.uf-sort .uf-sort-box'),
			sortbox_text = $('.uf-sort .uf-select span'),
			options = $('.uf-sort .uf-options');
		
			
		// add click hanlder to open sort options
		sortbox_text.on('click', function(){
			sortbox.toggleClass('uf-show-options');
		}).on('mousedown', function(e){
			// prevent text inside of select box to be selected
			e.preventDefault();
		});
		
		// add click handler to choose cartain option from list
		options.on('click', 'a', function(e){
			var option = $(this).attr('href').substr(1);
			sortbox.removeClass('uf-order-asc uf-order-desc');
			if(option) {
				var order = that.options.sort.options[option].order;				
				that.sort = [option, order.toUpperCase()];
				sortbox_text.text($(this).text());
				sortbox.addClass('uf-order-' + order.toLowerCase());
			} else {
				that.sort = null;
				sortbox_text.html(that.options.sort.placeholder  + ' &hellip;');
			}
			
			// close sort options
			sortbox.removeClass('uf-show-options');
			
			// update items as soon as sort option has been set
			that.updateList();
			
			// prevent defaults
			e.preventDefault();
			
		});
		
		// add click hander to reorder icon
		$('.uf-sort .uf-order').on('click', function(e){
			if(that.sort !== null) {				
				// rearange items and change sort order for next time
				var order = (that.sort[1] == 'ASC' ? 'DESC' : 'ASC');
				that.sort = [that.sort[0], order];
				sortbox.removeClass('uf-order-asc uf-order-desc').addClass('uf-order-' + order.toLowerCase());
				that.updateList();
			}
			// close sort options
			sortbox.removeClass('uf-show-options');
			e.preventDefault();
		});
	
	};
	
	
	/**
		Method to add click events to the filters
		Also it adds/removes active filters from
		this.filters object
	*/
	
	UniFilter.prototype.addFilterEvents = function(){
	
		// UniFilter object
		var that = this;
		
		// loop filters set in options
		for(var filter_name in this.options.filters) {
			var filter_option = this.options.filters[filter_name];
			
			// array that will hold selected tags for every filter set 
			this.filters[filter_name] = [];
			
			(function(name, option){
				
				// add click event handler for tags under certain filter
				$('#uf-' + name + ' .uf-tags').on('click', 'a', function(e){
				
					// prevent event defaults
					e.preventDefault();
					
					// check if filter tag is not hidden
					if($(this).parent().hasClass('uf-tag-hidden')) {
						return;
					}
					
					// get filter tag from "href" attr
					var tag = $(this).attr('href').substr(1);
					
					// when more than one filter tag can be selected
					if(option.multiple) {
						$(this).parent().toggleClass('uf-selected');
						
						// if tag is not in list add it, otherwise remove from list
						var tag_index = that.filters[name].indexOf(tag);
						if(tag_index == -1) {
							that.filters[name].push(tag);
						} else {
							that.filters[name].splice(tag_index, 1);
						}
					} else {
						
						// return if filter is already selected
						if($(this).parent().hasClass('uf-selected')) {							
							return;
						} else {
							$(this).parent().addClass('uf-selected').siblings().removeClass('uf-selected');
							that.filters[name] = [tag];
						}
					}
					
					// hide filter tags with no items, when leading filter is selected
					that.hideEmptyFilters();
					
					// apply filters and display items
					that.filterItems();
				});
				
				
				// reset filters
				$('#uf-' + name + ' .uf-reset').on('click', function(){
									
					// check if all items are visible
					if(that.list.children('.uf-item').length !== that.items.length) {
						
						// remove active class for filter tag and reset filters
						$(this).siblings().removeClass('uf-selected');
						that.filters[name] = [];
						
						// check if leading filter is to be reset
						// and show hidden filter tags
						if(that.options.hideEmptyFilters) {
							var leading_filters = that.getLeadingFilters();
							if($(this).closest('.uf-filter').is('#uf-' + leading_filters[0])) {	
								that.container.find('.uf-tags > li').removeClass('uf-tag-hidden');
							}
						}
						
						// apply filters and display items
						that.filterItems();
					
					}						
				
				});
				
			})(filter_name, filter_option);
			
		}
		
	};
	
	
	/**
		Method to add keypress / reset events on search fields 
		and populate this.search object with search queries
	*/
	
	UniFilter.prototype.addSearchEvents = function(){
	
		// unifilter object
		var that = this;
		
		// assign key up event on search input fields
		for(var search in this.options.search) {
		
			// array that will hold active search data
			that.search[search] = [];
		
			// closure
			(function(search_name){
			
				// timer to delay search
				var timer;
			
				// on every keyup event search items
				$('#uf-' + search_name + ' input[type="search"]').on('keyup', function(e){
				
					// input field
					var input = this;
					
					// add delay before running search
					window.clearTimeout(timer);
					timer = window.setTimeout(function(){
						var query = $(input).val().trim();
						that.search[search_name] = (query === '') ? [] : query.replace(/[^\w\s']/g, '').split(/\s+/);
						that.searchItems();
					}, 500);
					
				});
				
				// input reset
				$('#uf-' + search_name + ' .uf-reset').on('click', function(){
					var input = $(this).siblings('input[type="search"]');
					if(input.val() === "") {
						return;
					} else {
						input.val("");
						that.search[search_name] = [];
						that.searchItems();
					}
				});
			
			})(search);
		
		}
	
	};
	
	
	/**
		Method to add events to the range select
	*/
	
	UniFilter.prototype.addRangeEvents = function(){
	
		// unifilter object
		var that = this;
			
		// loop range options
		for(var range_name in this.options.range) {	
		
			// closure
			(function(name){
			
				// range option
				var range_option = that.options.range[name];
				
				// slider elements
				var slider = $('#uf-' + name + ' .uf-slider'),
					path = $('.uf-path', slider),
					handle_left = $('.uf-handle-left', slider),
					handle_right = $('.uf-handle-right',slider);
				var handle_grab = 0, dragging = false, timer;
				
				// range min/max value
				var scale = range_option.scale.replace(/[^\d-\.]+/g, '').split('-');
				var min_scale = parseFloat(scale[0]), 
					max_scale = parseFloat(scale[1]);
								
				// array to store min/max range
				that.range[name] = [];
																
				// right handle grab
				handle_right.on('mousedown touchstart', function(e){
				
					// tooltip within handle
					var tooltip = $(this).find('.uf-tooltip');
					
					// save initial range value for left handle
					if(typeof that.range[name][0] === "undefined") {
						that.range[name][0] = min_scale;
					}
					
					// get click/touch position relative to the document
					var page_x = (e.originalEvent.touches ? e.originalEvent.touches[0].pageX : e.pageX);
										
					// get coordinates of mousedown event within scrollbar handle
					handle_grab = page_x - path.offset().left - handle_right.position().left;
												
					// add "mousemove" and "mouseup" even handlers to the document
					$(document).on('mousemove.unifilter touchmove.unifilter', function(e){
						if(dragging) {
							var max_left = path.width() - handle_right.width();
							var page_x = (e.originalEvent.touches ? e.originalEvent.touches[0].pageX : e.pageX);
							var left = page_x - path.offset().left - handle_grab;
							// set handle position limits
							left = Math.max(handle_left.position().left, Math.min(max_left, left));
							// update handle position
							handle_right.css('left', left);
							// save active range to unifilter object
							var scale_value = (max_scale - min_scale) * (left / max_left) + min_scale;
							// update tooltip value 
							tooltip.css('margin-left', -tooltip.outerWidth() / 2);
							tooltip.text(range_option.prefix + 
								scale_value.toFixed(range_option.precision));
							// save active range to unifilter object
							that.range[name][1] = scale_value;
							window.clearTimeout(timer);
							timer = window.setTimeout(function(){
								that.rangeItems();
							}, 500);
						}
					});
								
					// prevent selection
					e.preventDefault();
					
					// add a dragging class to the slider
					dragging = true;
					slider.addClass('uf-dragging-right');
				
				});
				
				
				// left handle grab
				handle_left.on('mousedown touchstart', function(e){
				
					// tooltip within handle
					var tooltip = $(this).find('.uf-tooltip');
										
					// save initial range value for right handle
					if(typeof that.range[name][1] === "undefined") {
						that.range[name][1] = max_scale;
					}	
					
					// get click/touch position relative to the document
					var page_x = (e.originalEvent.touches ? e.originalEvent.touches[0].pageX : e.pageX);
										
					// get coordinates of mousedown event within scrollbar handle
					handle_grab = page_x - path.offset().left - handle_left.position().left;
																						
					// add "mousemove" and "mouseup" even handlers to the document
					$(document).on('mousemove.unifilter touchmove.unifilter', function(e){
						if(dragging) {
							var max_left = handle_right.position().left;
							var page_x = (e.originalEvent.touches ? e.originalEvent.touches[0].pageX : e.pageX);
							var left = page_x - path.offset().left - handle_grab;
							// set handle position limits
							left = Math.max(0, Math.min(max_left, left));
							// update handle position
							handle_left.css('left', left);
							// save active range to unifilter object
							var scale_value = (that.range[name][1] - min_scale) * 
									(left / max_left) + min_scale;
							// update tooltip value 
							tooltip.css('margin-left', -tooltip.outerWidth() / 2);
							tooltip.text(range_option.prefix + 
								scale_value.toFixed(range_option.precision));
							// save active range to unifilter object
							that.range[name][0] = scale_value;
							window.clearTimeout(timer);
							timer = window.setTimeout(function(){
								that.rangeItems();
							}, 500);
						}
					});
								
					// prevent selection
					e.preventDefault();
					
					// add a dragging class to the slider
					dragging = true;
					slider.addClass('uf-dragging-left');
				
				});	
				
				// prevent click on both handles
				handle_left.add(handle_right).on('click', function(e){
					e.preventDefault();
				});
				
				// when we release left/right handle
				$(document).on('mouseup.unifilter touchend.unifiltert', function() {
					if(dragging) {
						slider.removeClass('uf-dragging-right uf-dragging-left');
						// set dragging to false a while after "click" event fired
						window.setTimeout(function(){ 
							dragging = false;
						}, 10);
						// remove handlers
						$(document).off('mousemove.unifilter touchmove.unifilter');
					}
				});
			
			})(range_name);
			
							
		} // end loop ranges
	
	};
	
	
	/** 
		Method to set number of matched filters to
		"this.filters_match" property for an item
	*/
	
	UniFilter.prototype.filterItems = function(){
		
		// loop items
		for(var i = 0; i < this.data.length; i++) {		
			var item = this.data[i];
			
			// reset filters_match to 0
			item.filters_match = 0;
			
			// loop selected filter tags and check how many of them match current item
			for(var selected_filter in this.filters) {
				
				// in "bestmatch" mode items to be displayed should have at least one tag from 
				// the "leading" filter, otherwise they should not be displayed at all
				var is_filter_leading = false, has_leading_tag = false;
				if(this.options.bestMatch) {
					if(this.leading_filters.indexOf(selected_filter) !== -1 && 
					this.filters[selected_filter].length) {
						is_filter_leading = true;
					}
				}
			
				for(var k = 0; k < this.filters[selected_filter].length; k++) {
					var tag = this.filters[selected_filter][k];	
					if(item.filters[selected_filter].indexOf(tag) !== -1) {
						item.filters_match++;
						if(is_filter_leading) {
							has_leading_tag = true;
						}
					}
				}
				
				// if filter is leading but item does not have its tags, make it hidden
				if(is_filter_leading && !has_leading_tag) {			
					item.filters_match = -100;
				}
				
			}	
		}
										
		// redisplay items
		this.updateList();
		
		// (deeplinking) update URL for active filters
		if(this.options.deepLinking) {
			var url_hash = '#';
			for(var active_filter in this.filters) {
				if(this.filters[active_filter].length) {
					if(url_hash.length > 1) {
						url_hash += '&'
					}
					url_hash += active_filter + '=' + this.filters[active_filter].join(',');
				}
			}
			window.location.hash = url_hash;
		}
		
	};
	
	
	/**
		Method to update item grid and display items after filters, sort and search 
		have been applied
	*/
	
	UniFilter.prototype.updateList = function(){
		
		// UniFilter object
		var that = this;
		
		// check if animation is running
		if(this.list.hasClass('uf-animate')) { 
			return; 
		}
				
		// get number of selected filters 
		var max_filters = 0;
		for(var filter_name in this.filters) {
			// don't count filters separately if "multiple" option is set to true
			if(this.options.filters[filter_name].multiple && this.filters[filter_name].length) {
				max_filters += 1;
			} else {
				max_filters += this.filters[filter_name].length;
			}
		}
				
		// get number of search words
		var max_search = 0;
		for(var search_name in this.search) {
			max_search += this.search[search_name].length;
		}
		
		// get number of active ranges
		var max_range = 0;
		for(var range_name in this.range) {
			if(this.range[range_name].length) {
				max_range++;
			}
		}
				
		// total num of all active filters, search queries and ranges
		var total_active = max_filters + max_search + max_range;
				
		// helter function to start CSS3 animations on items by adding certain classes
		function _animate(item, toggle){
			if(that.options.animationType && that.options.animationType !== 'none') {
				item = $(item);
				var animation_class = 'uf-animate-opacity'; // default opacity animation
				if(that.options.animationType && that.options.animationType !== 'opacity') {
					animation_class += ' uf-animate-' + that.options.animationType;
				}
				item.addClass(animation_class); 
				item.get(0).offsetHeight;
				if(toggle){
					item.removeClass(animation_class);
				}
			}
		}
			
		// now enable animations for list items by adding certain classes
		if(that.options.animationType && that.options.animationType !== 'none') {
			this.list.addClass('uf-animate');
			this.items.css(this.getCSS3Property('transitionDuration'), this.options.animationTime + 'ms');
			// wait for animations to complete and remove all animation classes
			window.setTimeout(function(){
				that.list.removeClass('uf-animate');
				that.items.removeClass('uf-animate-opacity ' + 'uf-animate-' + that.options.animationType);
				that.items.css(that.getCSS3Property('transitionDuration'), '');
			}, this.options.animationTime + 50);
		}
				
		// clone visible items
		if(that.options.animationType && that.options.animationType !== 'none') {
			$.each(this.list.children('.uf-item:not(.uf-clone)'), function(){
				var item = $(this), clone = item.clone();
				var left = item.position().left, top = item.position().top;
				clone.addClass('uf-clone').css({
					position: 'absolute',
					left: left,
					top: top
				}).appendTo(that.list);
				// assign event that will remove item when its transition ends
				clone.one(that.getCSS3Event(), function(){
					$(this).remove();
				});
				window.setTimeout(function(){ 
					_animate(clone, false);
				}, 0);
			});
		} else {
			this.items.detach();
		}
		
		// remove separator and "not found" message for bestmatch mode
		this.list.find('#uf-separator, #uf-empty').remove();
								
		// if no search, filter or ranges are active
		if(total_active === 0) {
				
			// check if we need to sort items
			if(this.sort) {
			
				var visible_items = this.data.slice(0);
				this.sortItems(visible_items);
				
				// add items to the list
				while(visible_items.length){
					var item_data = visible_items.pop();
					this.list.prepend(item_data.item);
					_animate(item_data.item, true);
				}
												
				// fire "onListUpdate" event and return
				window.setTimeout(function(){
					that.container.trigger('onListUpdate');
				}, 50);
				
				return;
			}
			
			// add all items back to the list
			for(var i = 0; i < this.data.length; i++) {
				var item_data = this.data[i]; 
				item_data.display = true;
				this.list.append(item_data.item);
				_animate(item_data.item, true);
			}
			
			// fire "onListUpdate" event and return
			window.setTimeout(function(){
				that.container.trigger('onListUpdate');
			}, 50);
			
			return;
		}
						
		// if "bestMatch" mode is disabled
		if(this.options.bestMatch === false) {
					
			// set item's "display" property to true if it matches
			// ALL of the selected filters, ranges & search queries
			for(var i = 0; i < this.data.length; i++) {				
				var item_data = this.data[i];
				var total_match = item_data.search_match + item_data.filters_match + item_data.range_match;
				item_data.display = (total_match == total_active);
			}
						
			// add items with "display=true" property to "visible_items" array
			// while all hidden items add to the end of the list
			var visible_items = [];
			for(var i = 0; i < this.data.length; i++) {
				var item_data = this.data[i];
				if(item_data.display) {
					visible_items.push(item_data);
				} else {
					$(item_data.item).detach();
				}
			}
			
			// now sort items
			if(this.sort) {
				this.sortItems(visible_items);
			}
						
			// all items in "visible_items" array add to the list preserving their order
			while(visible_items.length){
				var item_data = visible_items.pop();
				this.list.prepend(item_data.item);
				_animate(item_data.item, true);
				
			}
							
		} else {
		
			// in "bestMatch" mode display items that match total amount of
			// active filters, search queries and ranges at the top of the list 
			// while the rest add below a separator line or hide at all
					
			// array with the visible & best match items
			var visible_items = [], bestmatch_items = [];
			
			// remove "uf-bestmatch" class
			this.items.removeClass('uf-bestmatch');
								
			// loop items
			for(var i = 0; i < this.data.length; i++) {
				var item_data = this.data[i], item = $(item_data.item);
				var total_match = item_data.filters_match + item_data.search_match + item_data.range_match;
				
				
				if(total_match > 0) {
					// loop number of active filters from low to high
					for(var k = 1; k <= total_active; k++ ) {
						// add items to visible list if they match to at least 
						// one filter, search or range
						if(total_match == k) {
							item_data.display = true;
							// add "uf-bestmatch" class to items that match all of the active
							// filters, search queries and ranges
							if(k == total_active) {
								bestmatch_items.push(item_data);
								item.addClass('uf-bestmatch');
							} else {
								visible_items.push(item_data);
							}
						} 
					}
				} else {
					item.detach();
				}
										
			} // end loop items
						
			// sort items if enabled
			if(this.sort) {
				if(bestmatch_items.length) {
					this.sortItems(bestmatch_items);
				} else {
					this.sortItems(visible_items);
				}
			}
			
			// merge visible and bestmatch arrays and add them to the list
			var all_items = bestmatch_items.concat(visible_items);
			while(all_items.length){
				var item_data = all_items.pop(), 
					item = $(item_data.item);
				this.list.prepend(item);
				_animate(item, true);
			}
			
			
			if(visible_items.length) {
				if(bestmatch_items.length) {
					this.list.children('.uf-bestmatch:not(.uf-clone)').last().
					after('<div id="uf-separator">' + this.options.bestMatchText + '</div>');
				} else{
					this.list.prepend('<div id="uf-separator">' + this.options.bestMatchText + '</div>');
				}
			}
			
			if(bestmatch_items.length === 0) {
				this.list.prepend('<div id="uf-empty">'+ this.options.bestMatchEmpty + '</div>');
			} 
			
		
		}
		
		// check if autoScroll option is set
		if(this.options.autoScroll && total_active) {
			window.clearTimeout(this.scrollTimer);
			this.scrollTimer = window.setTimeout(function(){
				$('body, html').stop().animate({scrollTop: $(that.list).offset().top}, 300, 'swing');
			}, this.options.autoScrollDelay);
		}
		
		// fire "onListUpdate" event 
		window.setTimeout(function(){
			that.container.trigger('onListUpdate');
		}, 50);
		
	};
	
	
	/** 
		Function to sort items in array with item data
	*/
	
	UniFilter.prototype.sortItems = function(items_data) {
		
		// Unifilter object
		var that = this;
			
		// sort items in place using JS sort() method
		items_data.sort(function(data1, data2){
			var sort1 = data1.sort[that.sort[0]], 
				sort2 = data2.sort[that.sort[0]];
			if(sort1 == sort2) {
				return 0;
			} else if(that.sort[1] == "ASC") {						
				return sort2 < sort1 ? 1 : -1;
			} else {
				return sort2 > sort1 ? 1 : -1;
			}
		});
				
	};
	
	
	/** 
		Method to apply search and set item's "search_match" 
		property to a number of matches with a query
	*/
	
	UniFilter.prototype.searchItems = function(){ 
	
		for(var i = 0; i < this.data.length; i++) {
			var item_data = this.data[i];
			
			// reset search match to 0
			item_data.search_match = 0;
			
			// loop through active search (this.search)
			for(var search_name in this.search) {
				// loop query parts in search
				for(var k = 0; k < this.search[search_name].length; k++){
					var query = this.search[search_name][k];
					var reg = new RegExp('\\b' + query, 'gi');
					if(reg.test(item_data.search[search_name].join(' '))){
						item_data.search_match++;
					} 
				}	
			}	
			
		}
		
		// redisplay items
		this.updateList();
	};
	
	
	/**
		Method to check if item is passing any of active ranges 
		and set the "range_match" property of an item to their amount
	*/
	
	UniFilter.prototype.rangeItems = function(){
			
		// loop items data
		for(var i = 0; i < this.data.length; i++) {		
			var item_data = this.data[i]; 
			
			// reset item's "range_match" value to 0
			item_data.range_match = 0;
			
			// loop active ranges
			for(var range_name in this.range) {
				
				// get min, max values of active range
				var min = this.range[range_name][0];
				var max = this.range[range_name][1];
				
				// increase "range_match" by one if item's range value passes min, max of the active range
				if( item_data.range[range_name] >= min && item_data.range[range_name] <= max) {
					item_data.range_match++;
				}
				
			}
				
		}
				
		// update item list
		this.updateList();
	};
	
	
	/**
		Method to get leading filters
	*/
	
	UniFilter.prototype.getLeadingFilters = function(){
		var leading = [];
		for(var filter_name in this.options.filters) {
			if(this.options.filters[filter_name].leading === true) {
				leading.push(filter_name);
			}
		}
		return leading;
	};
	
	
	
	/**
		Method to get seach data for an item 	
	*/
	
	UniFilter.prototype.getItemSearch = function(item) {
			// object that will hold search params for an item
			var search_params = {};
			
			// if search is not set in options, return null
			if(!this.options.search) { return null; }
				
			// loop search options and retrieve search params for items
			for(var search_name in this.options.search) {				
				var data, search = this.options.search[search_name];
				search_params[search_name] = [];
				// check if there is a custom function to get search data
				if(search.getSearchData && typeof search.getSearchData === "function") {
					data = search.getSearchData.call(item, search_name);
					if(Array.isArray(data)) {
						search_params[search_name] = data;
					}
				} else {
					data = $(item).data(search_name);
					if(data && data.length) {
						search_params[search_name] = data.split(/\s*,\s*/);
					} 
				}
				
			}
			
			return search_params;
	};
	
	
	/**
		Method to get sort data for an item either 
		from "data-{sort_name} attribute or by using 
		getSortData() custom function
	*/
	
	UniFilter.prototype.getItemSort = function(item) {
		
		// object with sort data for an item
		var sort_data = {};
		
		// if sort is not set in options, return null
		if(!this.options.sort) { return null; }
		
		// loop all sort entries
		for(var sort_name in this.options.sort.options) {
			var sort = this.options.sort.options[sort_name];
			if(sort.getSortData && typeof sort.getSortData == "function") {
				sort_data[sort_name] = sort.getSortData.call(item, sort_name);
			} else {
				sort_data[sort_name] = $(item).data(sort_name);
			}
		}
		
		// return sort data
		return sort_data;
	};
	
	
	/**
		Method to get range value for an item either 
		from "data-{range_name}" attribute or by using 
		getRangeData() custom function
	*/ 
	
	UniFilter.prototype.getItemRange = function(item){
			
		// object with range data for an item
		var range_data = {};
		
		// if range option is not set, return null
		if(!this.options.range) { return null; }
		
		// loop all range options
		for(var range_name in this.options.range) {
			var range = this.options.range[range_name];
			if(range.getRangeData && typeof range.getRangeData == "function") {
				range_data[range_name] = range.getRangeData.call(item, range_name);
			} else {
				range_data[range_name] = $(item).data(range_name);
			}
		}
		
		// return range data
		return range_data;
	};
	
	
	/** 
		Method to parse URL and activate certain filters based on 
		#hash part of an URL
	*/
	
	UniFilter.prototype.addDeepLinking = function(){
	
		// check if "deeplinking" option is set to true
		if(!this.options.deepLinking) {
			return;
		}
		
		// parse hash part of URL and 
		// populate active filters array "this.filters"
		var hash_parts = location.hash.substr(1).split('&');
		for(var i = 0; i < hash_parts.length; i++) {
			
			// test structure (filter=tag or filter=tag1,tag2) 
			if(/^\w+=(\w+\,?)+$/.test(hash_parts[i]) ) {
						
				var hash_split = hash_parts[i].split('=');
				this.filters[hash_split[0]] = hash_split[1].split(',');
			
				// mark filters selected (add 'uf-selected' class)
				for(var k = 0; k < this.filters[hash_split[0]].length; k++) {
					var tag = this.filters[hash_split[0]][k];
					$('#uf-' + hash_split[0] + ' .uf-tags > li').has('a[href="#' + tag + '"]').addClass('uf-selected');
				}
			
			}
		
		}
		
		// hide filter tags with no items, when leading filter is selected
		this.hideEmptyFilters();
	
		// filter items
		this.filterItems();
		
	};
	
	
	/**
		Function will check if leading filter is selected and it will hide
		filter tags that have no items and are not leading
		
	*/
	
	UniFilter.prototype.hideEmptyFilters = function(){
	
		// return if "hideEmptyFilters" plugin option is disabled
		if(!this.options.hideEmptyFilters) {
			return;
		}
	
		// get leading filters
		var leading = this.getLeadingFilters();
		var leading_filter = ''; // leading filter name
		
		// look if leading filter is in selected filter tags array
		for(var i = 0; i < leading.length; i++) {
			if(this.filters.hasOwnProperty(leading[i]) && this.filters[leading[i]].length) {
				leading_filter = leading[i];
				break;
			}
		}
		
		// if leading filter is not selected - return
		if(leading_filter === ''){
			return;
		}
		
		// tag/tags for selected leading filter
		var leading_tags = this.filters[leading_filter];		
		
		// find items that have selected leading filter tags;
		// save other item filters in active_filters array
		var visible_filters = {};
		
		// loop items and check their filters
		for(var k = 0; k < this.data.length; k++) {	
			var item_filters = this.data[k].filters;
					
			// first check if item has leading filter
			if(item_filters[leading_filter].length > 0) {
			
				// next check if leading filter tags match the item 
				for(var m = 0; m < item_filters[leading_filter].length; m++) {
					var item_tag = item_filters[leading_filter][m];
					if(leading_tags.indexOf(item_tag) !== -1) {
						
						// ok. now get filter/tags for item and 
						// save them into visible_filters array
						for(var item_filter in item_filters){
							if(visible_filters.hasOwnProperty(item_filter)) {
								visible_filters[item_filter] = visible_filters[item_filter].concat(item_filters[item_filter]);
							} else {
								visible_filters[item_filter] = item_filters[item_filter];
							}
						}
						
					} 
				}
				
			}
			
		}
		
		// remove leading filter entry from visible_filters array
		delete(visible_filters[leading_filter]);
		
		// make filter tags uniq for every filter
		for(var filter_name in visible_filters) {
			var unique_tags = [], all_tags = visible_filters[filter_name];
			while(all_tags.length) {
				var tag = all_tags.pop();
				if(unique_tags.indexOf(tag) === -1) {
					unique_tags.push(tag);
				}
			}
			visible_filters[filter_name] = unique_tags;
		}
		
		// next hide filters if they are not in visible_filters array
		for(var filter_name in visible_filters) {
			var filter_markup = this.container.find('#uf-' + filter_name + ' .uf-tags');
			filter_markup.children(':not(.uf-reset)').addClass('uf-tag-hidden');
			for(var k = 0; k < visible_filters[filter_name].length; k++) {
				var visible_tag = visible_filters[filter_name][k];
				filter_markup.find('[href="#' + visible_tag + '"]').parent().removeClass('uf-tag-hidden');
			}
		}
				
				
	};
	
	
	/**
		Define UniFilter jQuery Plugin 
	*/
	
	
	$.fn.unifilter = function(list, options) {
		
		// default plugin options
		var default_options = {
			selector: '',							// selector for items in list, none by default
			animationType: 'opacity',				// animation type for items, e.g. 'none', 'opacity',
													// 'scale', 'translate' or 'rotate'
			animationTime: 500,						// duration of animation, ms
			order: 'filters, search, sort, range',	// order in which to display filters, search, sort & range
			bestMatch: false,						// if set to true display items in order of their best match
			 										// otherwise show only those items that match all 
			 										// filters together
			bestMatchText: 'You may also like',		// message to display below "best match" items
			bestMatchEmpty: 'No items found',		// message to display if no items match selected filters
			autoScroll: false,						// scroll automatically to filtered items
			autoScrollDelay: 1000,					// delay for auto scroll, ms
			deepLinking: true,						// enable deeplinking for filters
			hideEmptyFilters: false,				// hide filters with no items, when leading filter is active
			filters: null,							// object with filters configuration, defaut null
			search: null,							// object with search configuration, default null
			sort: null,								// object with sort configuration, default null
			range: null								// object with range configuration, default null
		};
		
		
		// default filter options
		var filter_options = {
			display: true, 				// display this filter or not
			title: '',					// title for filter, none by default
			subtitle: '',				// subtitle for filter, none by default
			multiple: false,			// allow multiple filters to be selected at the same time
			tooltip: false,				// show tooltip with amount of items for this filter
			leading: false,				// whether this filter is leading
			getFilterData: null,		// custom function to get filter tags for item ("this" keyword refers
										// to item DOM, while filter name is passed as argument; 
										// functions should return array with tags e.g. ["tag1, tag2, tag3"])
			sortFilterTags: null		// custom function to sort filter tags (array with filter tags is passed 
										// as argument; function should return new array with tags)
		};
		
		// default search options
		var search_options = {
			display: true,				// display this search box or not
			title: '',					// title for search box, none by default
			subtitle: '',				// subtitle for search box, none by default
			placeholder: 'Type here..', // placeholder text
			getSearchData: null			// function to get search data for an item ("this" keyword refers
										// to item DOM, while search name is passed as argument; 
										// should return array with search params e.g. ["search1, search2, search3"])
		};
		
		// default sort options
		var sort_options = {
			display: true,				// display this sorting box or not
			title: '',					// title for search box, none by default
			subtitle: '',				// subtitle for search box, none by default
			placeholder: 'Sort by',		// text for placeholder when no option is selected
			options: {
				"_dummy": {
					label: '',			// display name for this option, otherwise take sort option name
					order: 'DESC',		// default sorting order for this option
					getSortData: null	// function to get sorting data for an item ("this" keyword refers
				}						// to item DOM, while sort name is passed as argument; 
										// function should return number or string for sort )
			}
		};
		
		// default range options
		var range_options = {
			display: true,			// display this range select or not
			title: '',				// title for range select, none by default
			subtitle: '',			// subtitle for range select, none by default
			scale: '0-100',			// set a from-to scale in a form of '0-100'
			precision: 0,			// scale decimal precision
			prefix: '',				// prefix to put before the numbers, e.g. $ (dollar sign)
			getRangeData: null		// function to get range data for an item ("this" keyword refers
									// to item DOM, while range name is passed as argument; 
									// function should return a number)
		};
		
		// extend range options with defaults
		if(options.range && typeof options.range === 'object') {
			for(var entry in options.range) {
				options.range[entry] = $.extend(
					$.extend({}, range_options), 
					options.range[entry]
				);
			}
		}
		
		// extend filter options with defaults
		if(options.filters && typeof options.filters === 'object') {
			for(var entry in options.filters) {
				options.filters[entry] = $.extend(
					$.extend({}, filter_options), 
					options.filters[entry]
				);
			}
		}
		
		// extend search options with defaults
		if(options.search && typeof options.search === 'object') {
			for(var entry in options.search) {
				options.search[entry] = $.extend(
					$.extend({}, search_options), 
					options.search[entry]
				);
			}
		}
		
		// extend sort options with defaults
		if(options.sort && typeof options.sort === 'object') {
			if(options.sort.options && typeof options.sort.options === 'object') {
				var extended = {};
				for(var option_name in options.sort.options) {
					extended[option_name] = $.extend(
						$.extend({}, sort_options.options._dummy), 
						options.sort.options[option_name]
					);
				}
				options.sort.options = extended;
				options.sort = $.extend(sort_options, options.sort);
			}
		}		
		
		// extend plugin options
		options = $.extend(default_options, options);
														
		// init UniFilter
		return this.each(function(){
			new UniFilter(this, list, options);
		});
	
	};



})(jQuery);
