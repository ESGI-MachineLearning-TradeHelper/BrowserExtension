
var jcrop, selection

let serverHost = "";

var overlay = ((active) => (state) => {
  active = typeof state === 'boolean' ? state : state === null ? active : !active
  $('.jcrop-holder')[active ? 'show' : 'hide']()
  chrome.runtime.sendMessage({message: 'active', active})
})(false)

var image = (done) => {
  var image = new Image()
  image.id = 'fake-image'
  image.src = chrome.runtime.getURL('/images/pixel.png')
  image.onload = () => {
    $('body').append(image)
    done()
  }
}

var init = (done) => {
  $('#fake-image').Jcrop({
    bgColor: 'none',
    onSelect: (e) => {
      selection = e
      capture()
    },
    onChange: (e) => {
      selection = e
    },
    onRelease: (e) => {
      setTimeout(() => {
        selection = null
      }, 100)
    }
  }, function ready () {
    jcrop = this

    $('.jcrop-hline, .jcrop-vline').css({
      backgroundImage: `url(${chrome.runtime.getURL('/images/Jcrop.gif')})`
    })

    if (selection) {
      jcrop.setSelect([
        selection.x, selection.y,
        selection.x2, selection.y2
      ])
    }

    done && done()
  })
}

var capture = (force) => {
  chrome.storage.sync.get((config) => {
    serverHost = config.tradingmlHost;

    if (selection && (config.method === 'crop' || (config.method === 'wait' && force))) {
      jcrop.release()
      setTimeout(() => {
        chrome.runtime.sendMessage({
          message: 'capture', area: selection, dpr: devicePixelRatio
        }, (res) => {
          overlay(false)
          selection = null
          save(res.image, config.format, config.save)
        })
      }, 50)
    }
    else if (config.method === 'view') {
      chrome.runtime.sendMessage({
        message: 'capture',
        area: {x: 0, y: 0, w: innerWidth, h: innerHeight}, dpr: devicePixelRatio
      }, (res) => {
        overlay(false)
        save(res.image, config.format, config.save)
      })
    }
  })
}

var filename = (format) => {
  var pad = (n) => (n = n + '', n.length >= 2 ? n : `0${n}`)
  var ext = (format) => format === 'jpeg' ? 'jpg' : format === 'png' ? 'png' : 'png'
  var timestamp = (now) =>
    [pad(now.getFullYear()), pad(now.getMonth() + 1), pad(now.getDate())].join('-')
    + '-' +
    [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join('-')
  return `sc-${timestamp(new Date())}.${ext(format)}`
}

var save = (image, format, save) => {
  if (save === 'localStorage') {
    let name = filename(format);

    chrome.storage.local.set({ [name]: image }, function() {
      chrome.storage.local.get([name], function(result) {
        var settings = {
          type: "POST",
          url: serverHost + '?type=3',
          data: {
            "image": {
              name: filename(format),
              content: result[name]
            }
          },
        };

        $.ajax(settings).done(function (response) {
          console.log(response);
          response.imgSrc = result[name];

          chrome.runtime.sendMessage({
            name: "popup-response-received",
            response: response
            });
        }.bind(this));

      });
    }.bind(this));
  }
  if (save === 'file') {
    var link = document.createElement('a')
    link.download = filename(format)
    link.href = image
    link.click()
  }
  else if (save === 'clipboard') {
    navigator.clipboard.writeText(image).then(() => {
      alert([
        'Screenshot Capture:',
        `${image.substring(0, 40)}...`,
        'Saved to Clipboard!'
      ].join('\n'))
    })
  }
};

window.addEventListener('resize', ((timeout) => () => {
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    jcrop.destroy()
    init(() => overlay(null))
  }, 100)
})())

chrome.runtime.onMessage.addListener((req, sender, res) => {
  if (req.message === 'init') {
    res({}) // prevent re-injecting

    if (!jcrop) {
      image(() => init(() => {
        overlay()
        capture()
      }))
    }
    else {
      overlay()
      capture(true)
    }
  }
  return true
})

chrome.runtime.onMessage.addListener((request) => {
  if(request.type === 'popup-modal'){
    showModal(request.data.imgSrc, request.data.predict, request.data.predict_percent);
  }
})

let modal = document.createElement("dialog");

const showModal = (imageSrc, predictName, predictPercent) => {
  modal.setAttribute(
    "style",`
height:450px;
border: none;
top:150px;
border-radius:20px;
background-color:white;
position: fixed; box-shadow: 0px 12px 48px rgba(29, 5, 64, 0.32);
`
  );
  modal.innerHTML = `
<button style="padding: 8px 12px; font-size: 16px; border: none; border-radius: 20px;">x</button>
<div id="result-container">
    <div id="result-image-container">
      <img id="result-image">
    </div>
    <div id="result-container">
      <div id="result-predict-name-container">
        <span id="result-predict-name-info">Forme prédite :</span>
        <span id="result-predict-name">rectangle</span>
      </div>
      <div id="result-predict-percen-container">
        <span id="result-predict-percent-info">Probabilité :</span>
        <span id="result-predict-percent">50%</span>
      </div>
    </div>
</div>
`;
  document.body.appendChild(modal);
  let dialog = document.querySelector("dialog");
  dialog.showModal();

  $(modal).find('#result-image')[0].src = imageSrc;
  $(modal).find('#result-predict-name').first().text(predictName);
  $(modal).find('#result-predict-percent').first().text(predictPercent);

  dialog.querySelector("button").addEventListener("click", () => {
    dialog.close();
  });
}
