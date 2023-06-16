/*
	Author       :	Theme-Family
	Template Name:	Jame - Roofing & Plumbing HTML5 Landing Page Template
	Version      :	1.0
*/

(function($) {
    "use strict";
	
		/*PRELOADER JS*/
			$(window).on('load', function() { 
				$('.loader').fadeOut();
				$('.atf-preloader').delay(350).fadeOut('slow'); 
			}); 
		/*END PRELOADER JS*/
		
		/*--------------------------------------------------------------
		Sticky Header
		--------------------------------------------------------------*/
	
		$(window).on("scroll", function() {
			 var scroll = $(window).scrollTop();
			if (scroll >= 10) {
				$('.atf-sticky-header').addClass('atf-sticky-active');
			} else {
				$('.atf-sticky-header').removeClass('atf-sticky-active');
			}
		});

     
		/*--------------------------------------------------------------
		Mobile Menu
		--------------------------------------------------------------*/

        $('.atf-nav').append('<span class="atf-menu-toggle"><span></span></span>');
        $('.menu-item-has-children').append('<span class="atf-menu-dropdown-toggle"></span>');
        $('.atf-menu-toggle').on('click', function() {
            $(this).toggleClass("atf-toggle-active").siblings('.atf-nav-list').slideToggle();;
        });
        $('.atf-menu-dropdown-toggle').on('click', function() {
            $(this).toggleClass('active').siblings('ul').slideToggle();
        });

    
		/*--------------------------------------------------------------
		One Page Navigation
		--------------------------------------------------------------*/
        // Click To Go Top
        $('.atf-smooth-move').on('click', function() {
            var thisAttr = $(this).attr('href');
            if ($(thisAttr).length) {
                var scrollPoint = $(thisAttr).offset().top - 50;
                $('body,html').animate({
                    scrollTop: scrollPoint
                }, 800);
            }
            return false;
        });

        // One Page Active Class
        var topLimit = 300,
            ultimateOffset = 200;

        $('.atf-onepage-nav').each(function() {
            var $this = $(this),
                $parent = $this.parent(),
                current = null,
                $findLinks = $this.find("a");

            function getHeader(top) {
                var last = $findLinks.first();
                if (top < topLimit) {
                    return last;
                }
                for (var i = 0; i < $findLinks.length; i++) {
                    var $link = $findLinks.eq(i),
                        href = $link.attr("href");

                    if (href.charAt(0) === "#" && href.length > 1) {
                        var $anchor = $(href).first();
                        if ($anchor.length > 0) {
                            var offset = $anchor.offset();
                            if (top < offset.top - ultimateOffset) {
                                return last;
                            }
                            last = $link;
                        }
                    }
                }
                return last;
            }

            $(window).on("scroll", function() {
                var top = window.scrollY,
                    height = $this.outerHeight(),
                    max_bottom = $parent.offset().top + $parent.outerHeight(),
                    bottom = top + height + ultimateOffset;

                var $current = getHeader(top);

                if (current !== $current) {
                    $this.find(".active").removeClass("active");
                    $current.addClass("active");
                    current = $current;
                }
            });
        });
		
		// Background image
		$('.atf-dynamic-bg').each(function() {
				var src = $(this).attr('data-src');
				$(this).css({
					'background-image': 'url(' + src + ')'
				});
			});	
			
		//End Background image

		/*--------------------------------------------------------------
		Sticky Back To Top
		--------------------------------------------------------------*/
  
		  $(window).on('scroll', function() {
			if ($(window).scrollTop() > 50) {
				$('.atf-sticky-header').addClass('atf-nav');
				$('.back-to-top').addClass('open');
			} else {
				$('.atf-sticky-header').removeClass('atf-nav');
				$('.back-to-top').removeClass('open');
			}
		  });

		//**===================Scroll UP ===================**//
		
		// Back to top button 
		$(window).on('scroll', function () { 
			var scrolled = $(window).scrollTop();
			if (scrolled > 400) $('.back-to-top').addClass('active');
			if (scrolled < 400) $('.back-to-top').removeClass('active');
		});
		
		 $('.back-to-top').on('click', function () {
			$("html, body").animate({
				scrollTop: "0"
			}, 50);
		});
		
		// Back to top button 
			
		//**===================Testimonial Slider ===================**//
		
			$("#testimonial-slider").owlCarousel({
				margin:3,
				nav:false,
				loop:true,
				dots:true,
				responsive:{
					0:{
						items:1
					},
					767:{
						items:1
					},
					1000:{
						items:3
					}
				}
			});
			
			//**===================Testimonial Slider ===================**//
			
			//**===================Gallery Slider ===================**//
		
			$("#gallery-slider").owlCarousel({
				margin:5,
				nav:false,
				loop:true,
				dots:true,
				responsive:{
					0:{
						items:1
					},
					767:{
						items:2
					},
					1000:{
						items:3
					}
				}
			});
			
		//**===================Gallery Slider ===================**//
		
		/*--------------------------------------------------------------
		START NEW SLIDER JS
		--------------------------------------------------------------*/	
	  
		$("#news-slider").owlCarousel({
				margin:5,
				nav:false,
				loop:true,
				dots:true,
				responsive:{
					0:{
						items:1
					},
					991:{
						items:2
					},
					1000:{
						items:3
					}
				}
			});
		/*--------------------------------------------------------------
		END NEW SLIDER JS
		--------------------------------------------------------------*/	
	  	
		/*START PARTNER LOGO*/
		$('.atf-brand-active').owlCarousel({
			margin:5,
			autoplay:true,
			items: 3,
			loop:true,
			nav:false,
			dots:false,
			responsive:{
				0:{
					items:1
				},
				600:{
					items:3
				},
				1000:{
					items:5
				}
			}
		})
		
		/*END PARTNER LOGO*/
			
		/*--------------------------------------------------------------
		START MAILCHAMP JS
		--------------------------------------------------------------*/
		$('#mc-form').ajaxChimp({
			url: 'https://gmail.us10.list-manage.com/subscribe/post?u=c9af266402a277062d0d7cee0&amp;id=1211fda42f'
			/* Replace Your AjaxChimp Subscription Link */
		}); 
		
		/*--------------------------------------------------------------
		END MAILCHAMP JS
		--------------------------------------------------------------*/	
	  
		
		/* --------------------------------------------------------
           LightCase jQuery Active
        --------------------------------------------------------- */
        $('a[data-rel^=lightcase]').lightcase({
            transition: 'elastic', /* none, fade, fadeInline, elastic, scrollTop, scrollRight, scrollBottom, scrollLeft, scrollHorizontal and scrollVertical */
            swipe: true,
            maxWidth: 1170,
            maxHeight: 600,
        });	

		/* WOW Scroll Spy
			========================================================*/
			 var wow = new WOW({
				  //disabled for mobile
					mobile: false
				});

			wow.init();
			
		/* WOW Scroll Spy
		========================================================*/	
			
	
        
})(jQuery);
