function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  var jeSlika = sporocilo.indexOf("alt='slika'") > -1;
  var jeVideo = sporocilo.indexOf('https://www.youtube.com')>-1;
  if (jeSmesko || jeSlika || jeVideo) {
    //sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace('&lt;img', '<img').replace('png\' /&gt;', 'png\' />').replace('jpg\' /&gt;', 'jpg\' />').replace('gif\' /&gt;', 'gif\' />');
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
    sporocilo = sporocilo.replace(/(\&lt\;img)/g, '<img').replace(/png\' \/\&gt\;/g, 'png\' />').replace(/jpg\' \/\&gt\;/g, 'jpg\' />').replace(/gif\' \/\&gt\;/g, 'gif\' />');
    sporocilo = sporocilo.replace(/\&lt\;iframe/g, '<iframe').replace(/allowfullscreen\&gt\;\&lt\;\/iframe\&gt;/g, 'allowfullscreen></iframe>');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = procesirajPotencialneSlike(sporocilo);
  sporocilo = dodajSmeske(sporocilo);
  sporocilo = procesirajPotencialniVideo(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    
    
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

function procesirajPotencialneSlike(sporocilo)
{
  
  sporocilo = sporocilo.replace(new RegExp(
    '\\b(http\\:\\/\\/|https\\:\\/\\/)[^\ ]+(\\.jpg|\\.png|\\.gif)\\b',
    'gi'), function(url) {
      var zamenjava = "<img alt='slika' class='slika' src='"+url+"' />";
      //alert(zamenjava);
      return zamenjava;
  });
  
  return sporocilo;
}


var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "", trenutniZasebno="";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

function procesirajPotencialniVideo(sporocilo)
{
  
  sporocilo = sporocilo.replace(new RegExp('\\b(https\\:\\/\\/www\\.youtube\\.com\\/watch\\?v\\=[^\ ]+)\\b', 'gi'), function(url) {
      
      var videoCode=url.substr(url.indexOf("?v=")+3);
      //alert(videoCode);
      var zamenjava = "<iframe class='video' src='https://www.youtube.com/embed/"+videoCode+"' allowfullscreen></iframe>";
      return zamenjava;
  });
  
  return sporocilo;
}


$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }
    
    socket.on('dregljaj', function (vsebina) {
      if (vsebina.dregljaj) {
        //alert("dregljaj");
        $("#vsebina").trigger('startRumble');
        setTimeout(function () {
          $("#vsebina").trigger('stopRumble');
        }, 1500);
      } 
    });
    
    $("#vsebina").jrumble();
    
    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      if(uporabniki[i]!=trenutniZasebno)
        $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
      else
      {
        var el = divElementEnostavniTekst(uporabniki[i]);
        el.css("background-color","grey");
        $('#seznam-uporabnikov').append(el);
      }
    }
    
    $('#seznam-uporabnikov div').click(function() {
      trenutniZasebno =  $(this).text();
      $('#poslji-sporocilo').val('/zasebno "' + $(this).text()+'"');
      $('#poslji-sporocilo').focus();
    });
    
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}


