var $bLCaw$reactjsxruntime = require("react/jsx-runtime");
require("react");
var $bLCaw$reactdomclient = require("react-dom/client");
var $bLCaw$polotno = require("polotno");
var $bLCaw$polotnotoolbartoolbar = require("polotno/toolbar/toolbar");
var $bLCaw$polotnopagestimeline = require("polotno/pages-timeline");
var $bLCaw$polotnotoolbarzoombuttons = require("polotno/toolbar/zoom-buttons");
var $bLCaw$polotnosidepanel = require("polotno/side-panel");
var $bLCaw$polotnocanvasworkspace = require("polotno/canvas/workspace");
var $bLCaw$polotnomodelstore = require("polotno/model/store");


function $parcel$interopDefault(a) {
  return a && a.__esModule ? a.default : a;
}

function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "App", () => $05449a417923a4ab$export$86fbec116b87613f);
$parcel$export(module.exports, "createEditor", () => $05449a417923a4ab$export$eb02d1ee0d3cac30);










const $05449a417923a4ab$var$store = (0, $bLCaw$polotnomodelstore.createStore)({
    key: 'nFA5H9elEytDyPyvKL7T',
    // you can hide back-link on a paid license
    // but it will be good if you can keep it for Polotno project support
    showCredit: true
});
const $05449a417923a4ab$var$page = $05449a417923a4ab$var$store.addPage();
const $05449a417923a4ab$export$86fbec116b87613f = ({ store: store })=>{
    return /*#__PURE__*/ (0, $bLCaw$reactjsxruntime.jsxs)((0, $bLCaw$polotno.PolotnoContainer), {
        className: "",
        style: {
            width: '100vw',
            height: '100vh'
        },
        children: [
            /*#__PURE__*/ (0, $bLCaw$reactjsxruntime.jsx)((0, $bLCaw$polotno.SidePanelWrap), {
                children: /*#__PURE__*/ (0, $bLCaw$reactjsxruntime.jsx)((0, $bLCaw$polotnosidepanel.SidePanel), {
                    store: store
                })
            }),
            /*#__PURE__*/ (0, $bLCaw$reactjsxruntime.jsxs)((0, $bLCaw$polotno.WorkspaceWrap), {
                children: [
                    /*#__PURE__*/ (0, $bLCaw$reactjsxruntime.jsx)((0, $bLCaw$polotnotoolbartoolbar.Toolbar), {
                        store: store
                    }),
                    /*#__PURE__*/ (0, $bLCaw$reactjsxruntime.jsx)((0, $bLCaw$polotnocanvasworkspace.Workspace), {
                        store: store
                    }),
                    /*#__PURE__*/ (0, $bLCaw$reactjsxruntime.jsx)((0, $bLCaw$polotnotoolbarzoombuttons.ZoomButtons), {
                        store: store
                    }),
                    /*#__PURE__*/ (0, $bLCaw$reactjsxruntime.jsx)((0, $bLCaw$polotnopagestimeline.PagesTimeline), {
                        store: store
                    })
                ]
            })
        ]
    });
};
const $05449a417923a4ab$export$eb02d1ee0d3cac30 = ({ container: container })=>{
    const root = (0, ($parcel$interopDefault($bLCaw$reactdomclient))).createRoot(container);
    root.render(/*#__PURE__*/ (0, $bLCaw$reactjsxruntime.jsx)($05449a417923a4ab$export$86fbec116b87613f, {
        store: $05449a417923a4ab$var$store
    }));
};
// make API global for simple start in development
window.createEditor = $05449a417923a4ab$export$eb02d1ee0d3cac30;


