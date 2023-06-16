(function ($) {

  // back to top script

  var btn = $('#button');

  $(window).scroll(function () {
    if ($(window).scrollTop() > 300) {
      btn.addClass('show');
    } else {
      btn.removeClass('show');
    }
  });

  btn.on('click', function (e) {
    e.preventDefault();
    $('html, body').animate({ scrollTop: 0 }, '300');
  });


  // sticky menu script

  window.onscroll = function () { myFunction() };

  var header = document.getElementById("sticky-header");
  var sticky = header.offsetTop;

  function myFunction() {
    if (window.pageYOffset > sticky) {
      header.classList.add("sticky");
    } else {
      header.classList.remove("sticky");
    }
  }

  // pre loader script

  $(window).on('load', function () {
    $('#js-preloader').addClass('loaded');
  });

  // counter script

  $('.count').each(function () {
    $(this).prop('Counter', 0).animate({
      Counter: $(this).text()
    }, {
      duration: 5000,
      easing: 'swing',
      step: function (now) {
        $(this).text(Math.ceil(now));
      }
    });
  });

  // slider owl carousel

  var owl = $('.slider');
  owl.owlCarousel({
    rtl:true,
    animateOut: 'fadeOut',
    items: 1,
    loop: true,
    margin: 0,
    autoplay: true,
    autoplayTimeout: 2500,
    autoplayHoverPause: true,
  });

  // winner owl carousel

  $('.winner').owlCarousel({
    rtl:true,
    loop: true,
    margin: 30,
    lazyLoad: true,
    nav: false,
    responsive: {
      0: {
        items: 1
      },
      600: {
        items: 2
      },
      1000: {
        items: 5
      }
    }
  });

  // battles owl carousel

  $('.battles').owlCarousel({
    rtl:true,
    loop: false,
    margin: 0,
    lazyLoad: true,
    nav: false,
    responsive: {
      0: {
        items: 1
      },
      600: {
        items: 1
      },
      1000: {
        items: 1
      }
    }
  });

  // team owl carousel

  $('.team').owlCarousel({
    rtl:true,
    loop: true,
    margin: 30,
    lazyLoad: true,
    nav: false,
    responsive: {
      0: {
        items: 1
      },
      600: {
        items: 2
      },
      1000: {
        items: 4
      }
    }
  });


  // blog owl carousel

  $('.blog').owlCarousel({
    rtl:true,
    loop: true,
    margin: 30,
    lazyLoad: true,
    nav: false,
    responsive: {
      0: {
        items: 1
      },
      600: {
        items: 2
      },
      1000: {
        items: 3
      }
    }
  });

// rewards owl carousel

$('.rewards').owlCarousel({
  rtl:true,
  loop: true,
  margin: 30,
  lazyLoad: true,
  nav: false,
  responsive: {
    0: {
      items: 1
    },
    600: {
      items: 2
    },
    1000: {
      items: 5
    }
  }
});



})(window.jQuery);