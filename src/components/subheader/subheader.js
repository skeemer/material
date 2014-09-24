/**
 * @ngdoc module
 * @name material.components.subheader
 * @description
 * SubHeader module
 */
angular.module('material.components.subheader', [
  'material.components.sticky'
])
.directive('materialSubheader', [
  '$compile',
  materialSubheaderDirective
]);

/**
 * @ngdoc directive
 * @name materialSubheader
 * @module material.components.subheader
 *
 * @restrict E
 *
 * @description
 * The `<material-subheader>` directive is a subheader for a section
 *
 * @usage
 * <hljs lang="html">
 * <material-subheader>Online Friends</material-subheader>
 * </hljs>
 */

function materialSubheaderDirective($compile) {
  return {
    restrict: 'E',
    link: function(scope, $el, $attr) {
      var element = angular.element('<h2 material-sticky class="material-subheader ' + $attr.class + '">')
          .append($el.contents());

      $el.replaceWith(element);
      element = $compile(element)(scope);
    }
  };
}
