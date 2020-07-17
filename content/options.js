
var state = {
  shortcut: {},
  method: [
    {id: 'view', icon: '⬒', title: 'Capture Viewport'},
    // {id: 'full', icon: '⬛', title: 'Capture Document'},
    {id: 'crop', icon: '◩', title: 'Crop and Save'},
    {id: 'wait', icon: '◪', title: 'Crop and Wait'}
  ],
  format: [
    {id: 'png', title: 'PNG'},
    {id: 'jpeg', title: 'JPG'}
  ],
  save: [
    {id: 'file', title: 'To File'},
    {id: 'clipboard', title: 'To Clipboard (Base64)'},
    {id: 'localStorage', title: '[TRADINGML] To localStorage (Base64)'},
  ],
  dpr: [
    {id: true, title: 'Preserve original DPI size'},
    {id: false, title: 'Adjust to actual size'}
  ],
  tradingmlHost: [
    {id: "http://0.0.0.0:5000/api/predict", title: '[DEVELOPER] local server'},
    {id: "http://website.com:5000/api/predict", title: 'Production server'},
  ],
  tradingmlType: [
    {id: "1", title: 'Linear'},
    {id: "2", title: 'CNN'},
    {id: "3", title: 'Perceptron'},
    {id: "4", title: 'RNN'},
    {id: "5", title: 'UNET'},
  ]
}

chrome.storage.sync.get((config) => {
  state.method.forEach((item) => item.checked = item.id === config.method)
  state.format.forEach((item) => item.checked = item.id === config.format)
  state.save.forEach((item) => item.checked = item.id === config.save)
  state.dpr.forEach((item) => item.checked = item.id === config.dpr)
  state.tradingmlHost.forEach((item) => item.checked = item.id === config.tradingmlHost)
  state.tradingmlType.forEach((item) => item.checked = item.id === config.tradingmlType)
  m.redraw()
})

chrome.commands.getAll((commands) => {
  var command = commands.find((command) => command.name === 'take-screenshot')
  state.shortcut = command.shortcut
  m.redraw()
})

var events = {
  option: (name, item) => () => {
    state[name].forEach((item) => item.checked = false)
    item.checked = true
    chrome.storage.sync.set({[name]: item.id})
  },
  button: (action) => () => {
    chrome.tabs.create({url: {
      shortcut: 'chrome://extensions/shortcuts',
      location: 'chrome://settings/downloads',
    }[action]})
  }
}

var oncreate = {
  ripple: (vnode) => {
    mdc.ripple.MDCRipple.attachTo(vnode.dom)
  }
}

var onupdate = (item) => (vnode) => {
  if (vnode.dom.classList.contains('active') !== item.checked) {
    vnode.dom.classList.toggle('active')
  }
}

m.mount(document.querySelector('main'), {
  view: () => [

    m('.bs-callout',
      m('h4.mdc-typography--headline5', 'Server Host'),
      state.tradingmlHost.map((item) =>
        m('label.s-label', {onupdate: onupdate(item)},
          m('.mdc-radio',
            m('input.mdc-radio__native-control', {
              type: 'radio', name: 'tradingmlHost',
              checked: item.checked && 'checked',
              onchange: events.option('tradingmlHost', item)
            }),
            m('.mdc-radio__background',
              m('.mdc-radio__outer-circle'),
              m('.mdc-radio__inner-circle'),
            ),
          ),
          m('span', item.title)
        )
      )
    ),

    m('.bs-callout',
      m('h4.mdc-typography--headline5', '[ML] Model Type'),
      state.tradingmlType.map((item) =>
        m('label.s-label', {onupdate: onupdate(item)},
          m('.mdc-radio',
            m('input.mdc-radio__native-control', {
              type: 'radio', name: 'tradingmlType',
              checked: item.checked && 'checked',
              onchange: events.option('tradingmlType', item)
            }),
            m('.mdc-radio__background',
              m('.mdc-radio__outer-circle'),
              m('.mdc-radio__inner-circle'),
            ),
          ),
          m('span', item.title)
        )
      )
    ),
  ]
})
