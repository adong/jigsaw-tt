/* TT Jigsaw: the stage layer. A see-through WebGL canvas over the table (it never takes a tap) with an orthographic
   camera, where the brothers, Froggy and Foxy stand and celebrate in front of the puzzle.
     JG.stage.stageAt(px, py): a point on the screen → where to stand on the stage (its z = 0 plane)
     JG.stage.U: how many screen pixels one metre is (a boy is about 2 m tall) */
(function () {
  'use strict';
  const T = THREE;
  const JG = (window.JG = window.JG || {});

  const ST = { renderer: null, W: 1, H: 1, U: 50, scene: new T.Scene(), cam: new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 100), clear: true };

  function init(canvas) {
    const r = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputEncoding = T.sRGBEncoding;
    r.setClearColor(0x000000, 0);
    ST.renderer = r;
    ST.scene.add(new T.HemisphereLight('#ffffff', '#b8a070', 1.0));
    const d = new T.DirectionalLight('#ffffff', 0.9);
    d.position.set(-3, 6, 8);
    ST.scene.add(d);
    resize();
  }

  function resize() {
    const W = Math.max(1, innerWidth || 1), H = Math.max(1, innerHeight || 1);
    ST.W = W;
    ST.H = H;
    ST.renderer.setSize(W, H, false);
    ST.U = Math.max(30, Math.min(H * 0.11, 88));
    const c = ST.cam, hw = W / 2 / ST.U, hh = H / 2 / ST.U;
    Object.assign(c, { left: -hw, right: hw, top: hh, bottom: -hh });
    // the camera looks down a little so podiums and clouds show their tops
    c.position.set(0, 30 * Math.sin(0.16), 30 * Math.cos(0.16));
    c.lookAt(0, 0, 0);
    c.updateProjectionMatrix();
    c.updateMatrixWorld(true);
    ST.clear = true;
  }

  const ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 0, 1), 0);
  function stageAt(px, py, out = new T.Vector3()) {
    ndc.set((px / ST.W) * 2 - 1, -(py / ST.H) * 2 + 1);
    ray.setFromCamera(ndc, ST.cam);
    ray.ray.intersectPlane(plane, out);
    return out;
  }

  // draw only while someone's on stage; one last clear when they've all gone
  function render(busy) {
    if (!busy && !ST.clear) return;
    ST.renderer.clear();
    if (busy) ST.renderer.render(ST.scene, ST.cam);
    ST.clear = busy;
  }

  JG.stage = {
    init, resize, stageAt, render,
    get scene() { return ST.scene; },
    get U() { return ST.U; },
    get W() { return ST.W; },
    get H() { return ST.H; },
  };
})();
