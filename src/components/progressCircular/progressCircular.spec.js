describe('materialProgressCircular', function() {
  beforeEach(module('material.components.progressCircular'));

  it('should update aria-valuenow', inject(function($compile, $rootScope) {
    var element = $compile('<div>' +
      '<material-progress-circular value="{{progress}}">' +
      '</material-progress-circular>' +
      '</div>')($rootScope);

    $rootScope.$apply(function() {
      $rootScope.progress = 50;
    });

    var progress = element.find('material-progress-circular');

    expect(progress.eq(0).attr('aria-valuenow')).toEqual('50');
  }));
});
