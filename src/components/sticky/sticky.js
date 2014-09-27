/**
 * @ngdoc module
 * @name material.components.sticky
 * @description
 *
 * Sticky effects for material
 */

angular.module('material.components.sticky', [
  'material.components.content',
  'material.decorators',
  'material.animations'
])
.factory('$materialSticky', [
  '$window',
  '$document',
  '$$rAF',
  '$materialEffects',
  MaterialSticky
])
.directive('materialSticky', [
  '$materialSticky', 
  MaterialStickyDirective
]);

/**
 * @ngdoc factory
 * @name $materialSticky
 * @module material.components.sticky
 *
 * @description
 * The `$materialSticky`service provides a mixin to make elements sticky.
 *
 * @returns A `$materialSticky` function that takes `$el` as an argument.
 */

function MaterialSticky($window, $document, $$rAF, $materialEffects) {
  var browserStickySupport;

  // Scroll keeping variables to ensure that we continually re-render while we are scrolling
  var STOP_CHECK_AFTER = 100;
  var lastScrollAt;
  var keepChecking = false;

  /**
   * Registers an element as sticky, used internally by directives to register themselves
   */


  function registerStickyElement(scope, $el) {
    scope.$on('$destroy', function() { $deregister($el); });
    $el = Util.wrap($el, 'div', 'sticky-container');

    var ctrl = $el.controller('materialContent');

    if (!ctrl) { throw new Error('$materialSticky used outside of material-content'); }

    var $container = ctrl.$element;

    /*
     * The sticky object on the container stores everything we need.
     * `elements`: all known sticky elements within the container
     * `orderedElements`: elements, ordered by vertical position within the layout
     * `check`: debounced function to check elements for adjustment on scroll
     * `targetIndex`: the index in orderedElements of the currently active sticky el
    */

    var $sticky = $container.data('$sticky') || {
      elements: [], // all known sticky elements within $container
      orderedElements: [], // elements, ordered by vertical position in layout
      check: angular.bind(undefined, startChecking, $container),
      targetIndex: 0
    };

    $sticky.elements.push($el);

    // check sticky support on first register
    if (browserStickySupport === undefined) {
      browserStickySupport = checkStickySupport($el);
    } else if (browserStickySupport) {
      $el.css({position: browserStickySupport, top: '0px', 'z-index': 2});
    }

    if (!browserStickySupport) {
      if ($sticky.elements.length == 1) {
        $container.data('$sticky', $sticky);
        $container.on('scroll',  $sticky.check);
      }
      queueScan();
    }

    return $deregister;


    // Deregister a sticky element, useful for $destroy event.
    function $deregister($el) {
      if ($deregister.called) return;
      $deregister.called = true;
      var innerElements = elements.map(function(el) { return el.children(0); });
      var index = innerElements.indexOf($el);
      if (index !== -1) {
        elements[index].replaceWith($el);
        elements.splice(index, 1);
        if (elements.length === 0) {
          $container.off('scroll', $sticky.check);
          $container.removeData('$sticky');
        }
      }
    }

    // Method that will scan the elements after the current digest cycle
    function queueScan() {
      if (!queueScan.queued) {
        queueScan.queued = true;
        scope.$$postDigest(function() {
          scanElements($container);
          queueScan.queued = false;
        });
      }
    }
  }
  return registerStickyElement;

  // Function to check for browser sticky support

  function checkStickySupport($el) {
    var stickyProps = ['sticky', '-webkit-sticky'];
    for (var i = 0; i < stickyProps.length; ++i) {
      $el.css({position: stickyProps[i], top: 0, 'z-index': 2});
      if ($el.css('position') == stickyProps[i]) {
        return stickyProps[i];
      }
    }
    $el.css({position: undefined, top: undefined});
    return false;
  }


  /**
   * Function to prepare our lookups so we can go quick!
   */
  function scanElements($container) {
    if (browserStickySupport) return;

    var $sticky = $container.data('$sticky');

    // Sort based on position in the window, and assign an active index
    $sticky.orderedElements = $sticky.elements.sort(function(a, b) {
      return rect(a).top - rect(b).top;
    });

    $sticky.targetIndex = findTargetElementIndex();


    // Iterate over our sorted elements and find the one that is active
    function findTargetElementIndex() {
      var scroll = $container.prop('scrollTop');
      for(var i = 0; i < $sticky.orderedElements.length ; ++i) {
        if (rect($sticky.orderedElements[i]).bottom > 0) {
          return i > 0 ? i - 1 : i;
        } else {
          return i;
        }
      }
    }
  }

  // Function that executes on scroll to see if we need to do adjustments

  function startChecking($container) {
    console.log("Scroll");
    lastScrollAt = Date.now();
    if (!keepChecking) {
      console.log("Start");
      keepChecking = true;
      scheduleNext($container);
    }
  }

  function scheduleNext($container) {
    if (lastScrollAt.valueOf() >= (Date.now().valueOf() - STOP_CHECK_AFTER)) {
      $$rAF(function() {
        checkElements($container);
      });
    } else {
      console.log("Stop!");
      lastScrollAt = undefined;
      keepChecking = false;
    }
  }

  function checkElements($container) {

    var $sticky = $container.data('$sticky');

    var targetElementIndex = $sticky.targetIndex;
    var orderedElements = $sticky.orderedElements;

    /* 
     * Since we wrap in an element (to keep track of where in the layout the 
     * element would normally be, we use children to get the actual sticky 
     * element.
     */

    var content = targetElement().children(0);
    var contentRect = rect(content);
    var containerRect = rect($container);
    var targetRect = rect(targetElement());

    var next, nextRect; // pointer to next target

    if(targetElementIndex < orderedElements.length - 1) {
      next = targetElement(+1).children(0);
      nextRect = rect(next);
    }

    var scrollingDown = false;
    var currentScroll = $container.prop('scrollTop');
    var lastScroll = $sticky.lastScroll;
    if (currentScroll == lastScroll) return scheduleNext($container);
    if (currentScroll > (lastScroll || 0)) {
      scrollingDown = true;
    }
    $sticky.lastScroll = currentScroll;

    var stickyActive = content.data('$stickyActive');



    // If we are scrollingDown, sticky, and are being pushed off screen by a different element, increment
    if (scrollingDown && stickyActive && contentRect.bottom <= containerRect.top && nextRect && nextRect.top <= containerRect.top) {
      content.data('$stickyActive', false);
      incrementElement();

    //If we are going up, and our normal position would be rendered not sticky, un-sticky ourselves
    } else if (!scrollingDown && stickyActive && targetRect.top > containerRect.top) {
      content.data('$stickyActive', false);
      if (targetElementIndex > 0) {
        transformY(content, 0);
        incrementElement(-1);
        content.data('$stickyActive', true);
      }

    /* 
     * If we are going off screen and haven't been made sticky yet, go sticky
     * Check at 0 so that if we get lucky on the scroll position, we activate
     * sticky and avoid floating off the top for a second
     */

    } else if (scrollingDown && contentRect.top <= containerRect.top && !stickyActive) {
      content.data('$stickyActive', true);
      stickyActive = true;
    } 

    var offsetAmount, currentTop, translateAmt, pushing, pulling;

    // check if we need to push
    if (scrollingDown && rectsAreTouching(contentRect, nextRect)) {
      pushing = true;
      offsetAmount = contentRect.bottom - nextRect.top;
      currentTop = transformY(content);
      translateAmt = currentTop - offsetAmount;
      transformY(content, translateAmt);
    // Check if we need to pull
    } else if (!scrollingDown && targetElementIndex < orderedElements.length - 1 && contentRect.top < containerRect.top) {
      pulling = true;
      nextRect = rect(targetElement(+1).children(0));
      offsetAmount = contentRect.bottom - nextRect.top;
      currentTop = transformY(content);
      translateAmt = currentTop - offsetAmount;
      transformY(content, translateAmt);
    } 

    // See if we need to adjust sticky transform amount
    if (stickyActive && contentRect.top != containerRect.top && !(pushing || pulling)) {
      translateAmt = transformY(content) + (containerRect.top - contentRect.top);
      transformY(content, translateAmt);
    }

    scheduleNext($container);

    function incrementElement(inc) {
      inc = inc || 1;
      targetElementIndex += inc;
      content = targetElement().children(0);
      contentRect = rect(content);
      if(targetElementIndex < orderedElements.length - 1) {
        next = targetElement(+1).children(0);
        nextRect = rect(next);
      } else {
        next = undefined;
        nextRect = undefined;
      }
      $sticky.targetIndex = targetElementIndex;
    }

    function targetElement(indexModifier) {
      indexModifier = indexModifier || 0;
      if (targetElementIndex === undefined) return undefined;
      return orderedElements[targetElementIndex + indexModifier];
    }
  }

  function rectsAreTouching(first, second) {
    if (!(first && second)) return false;
    return first.bottom >= second.top;
  }

  // Helper functions to get position of element

  function rect($el) {
    return $el.hasOwnProperty(0) ? $el[0].getBoundingClientRect() : $el.getBoundingClientRect();
  }

  // Getter / setter for transform
  function transformY($el, amnt) {
    if (amnt === undefined) {
      return $el.data('translatedHeight') || 0;
    } else {
      $el.css($materialEffects.TRANSFORM, 'translate3d(0, ' + amnt + 'px, 0)');
      $el.data('translatedHeight', amnt);
    }
  }


}

/**
 * @ngdoc directive
 * @name materialSticky
 * @module material.components.sticky
 *
 * @description
 * Directive to consume the $materialSticky service
 *
 * @returns A material-sticky directive
 */
function MaterialStickyDirective($materialSticky) {
  return {
    restrict: 'A',
    link: $materialSticky
  };
}
