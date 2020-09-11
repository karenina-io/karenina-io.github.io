const MAX_LEN = 150
const MAX_DAILY = 10;
const MAX_DAILY0 = 14;


function toggle(el) {
    let state = Number(el.getAttribute('state'))
    let lvl = Number(el.getAttribute('lvl'))
    let text = el.getAttribute('alt')


    el.setAttribute('alt', el.innerText)
    el.innerText = text

    state = 1 - state
    el.setAttribute('state', state)

    lvl = Math.min(lvl, 1)
    let mark = state ? 'new' : ['maybe', 'old'][lvl]

    el.setAttribute('class', mark)
    // el.style.backgroundColor = colors[state]
    // el.style.textDecorationColor = colors[state]
}

const SAMPLES = {
    'en': 'he need buy aple and cereal. he will arrive there in 5 minutesss to make shopping in store',
    'zh': '我是坐着地铁来去办公室',
    'es': 'me no gustar comer los pizza por almerzo',
    'fr': 'je aimer mange les vegetables',
    'ja': '私イタリアで住でいます。',
    'ko': '나는좋아한다사과를.',
    'de': 'Du liebst ich.',
    'it': 'A me mi piace il gelato',
    'pt': 'Porque ele ainda no chegou?',
}

function fill(lang) {
    $('#text').text(SAMPLES[lang])
}

function clearInput() {
    document.getElementById('text').innerHTML = ''
    $('#text').empty()
}

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const LANG = urlParams.get('lang')
if (LANG) {
    fill(LANG)
}

const copyToClipBoard = (str) => {
    const el = document.createElement('textarea');
    el.value = str;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
};

function copy() {
    $('.old').remove()
    // $('.old').remove()
    $('#text').html($('#text').text())
    copyToClipBoard(document.getElementById('text').innerText)
}


function write() {
    chrome.tabs.sendMessage(window.id, {
        action: "write",
        q: document.getElementById('text').innerText
    }, function(response) {});
    window.close()
}

function correct() {

    let q = document.getElementById('text').innerText
    console.log(q)
    let url = 'https://us-central1-project-318531836785902414.cloudfunctions.net/f'
    // let url = 'https://us-central1-project-318531836785902414.cloudfunctions.net/correct'

    let data = {
        'q': q.trim(),
    }

    fetch(url, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        headers: {
            'Accept': 'application/json',
        },
        body: JSON.stringify(data) // body data type must match "Content-Type" header
    }).then(r => {
        console.log(r)
        return r.json()
    }).then(r => {
        console.log(r)

        let {
            corrections,
            input,
            output
        } = r
        let html = input
        let i = corrections.length
        for (let x of corrections.reverse()) {
            i--
            html = html.substring(0, x['start']) +
                `<span class="old" id="${i}old" onclick="$(this).replaceWith('${x.old}'); $('#${i}new').remove()">${x.old}</span>` +
                `<span class="new" id="${i}new" onclick="$(this).replaceWith('${x.new}'); $('#${i}old').remove()">${x.new}</span>` +
                html.substring(x['end'])
        }
        $('#text').html(html)
        // $('#output').html(output)
        refresh()

    })
}

// 615
function nqueries() {
    let n = localStorage.getItem('nqueries')
    if (n === null) {
        localStorage.setItem('nqueries', MAX_DAILY0)
        localStorage.setItem('last', Date.now())
    } else {
        n = Number(n)
        if (n === 0) {
            if (Date.now() - localStorage.getItem('last') > 3600000 * 24) {
                localStorage.setItem('last', Date.now())
                localStorage.setItem('nqueries', MAX_DAILY)
            }
        }
    }
    n = Number(localStorage.getItem('nqueries'))
    console.log(`n: ${n}`)
    return n
}

function spend(customer, n, f, g) {
    let data = {
        customer: customer,
        n: n,
        action: 'spend'
    }
    console.log(data)
    query(data, r => {
        console.log(r)
        if (r.status === 'success') {
            f()
        } else {
            g()
            refresh()
        }
    })
}

function prompt(m) {
    alert(m)
    refresh()
}

function analyze() {
    $('#analyze').text('Processing...')

    let len = document.getElementById('text').innerText.length
    let customer = localStorage.getItem('customer')

    if (len > MAX_LEN) {
        if (!customer) {
            prompt(`Input text length is too long. Enter a shorter length or subscribe to a plan in the Accounts tab.`)

        } else {
            spend(customer, len, correct, () => {
                prompt(`Input text length is too long. There's no subscription or your subscription credits ran out. Enter a shorter length or subscribe to a plan in the Accounts tab.`)
            })
        }
    } else {
        let n = nqueries();
        if (n > MAX_DAILY) {
            localStorage.setItem('nqueries', n - 1)
            correct()
        } else {
            if (!customer) {
                prompt('Please register or login for more free usage ')
            } else {
                if (n === 0) {
                    spend(customer, len, correct, () => {
                        prompt(`Your free usage for today ran out. Check back tomorrow or subscribe to a plan.`)
                    })
                } else {
                    localStorage.setItem('nqueries', n - 1)
                    correct()
                }
            }
        }
    }
}

function refresh() {

    if (localStorage.getItem('customer')) {
        $('#free').hide()
    } else {
        $('#free').show()


    }
    $('#analyze').text('Analyze')
}



function query(data, callback) {

    return fetch('https://us-central1-project-318531836785902414.cloudfunctions.net/acct', {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        headers: {
            'Accept': 'application/json',
        },
        body: JSON.stringify(data) // body data type must match "Content-Type" header
    }).then(r => r.json()).then(r => {
        return callback(r)
    })
}


for (lang in SAMPLES) {
    tmp="\""+lang+"\""
    eval(`document.getElementById(${tmp}).addEventListener("click", ()=>fill(${tmp}), false)`);
}
refresh()