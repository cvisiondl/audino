document.addEventListener('DOMContentLoaded', function() {
  var wavesurfer = WaveSurfer.create({
    container: document.querySelector('#waveform'),
    barWidth: 2,
    barHeight: 1,
    barGap: null,
    mediaControls: false,
    plugins: [WaveSurfer.regions.create()]
  });

  wavesurfer.load('/audio/' + audio_id);

  var playpauseButton = document.querySelector('#playpause');
  var backwardButton = document.querySelector('#skip-backward');
  var forwardButton = document.querySelector('#skip-forward');

  playpauseButton.style.display = 'none';
  backwardButton.style.display = 'none';
  forwardButton.style.display = 'none';

  playpauseButton.addEventListener('click', function() {
    wavesurfer.playPause();
  });

  backwardButton.addEventListener('click', function() {
    wavesurfer.skipBackward(5);
  });
  forwardButton.addEventListener('click', function() {
    wavesurfer.skipForward(5);
  });

  wavesurfer.on('ready', function() {
    playpauseButton.style.display = '';
    backwardButton.style.display = '';
    forwardButton.style.display = '';
  });

  wavesurfer.on('ready', function() {
    wavesurfer.enableDragSelection({color: 'rgba(0, 102, 255, 0.3)'});
    var form = document.forms.transcription;
    var previousTranscriptions = form.elements.segmented_transcription.value;
    loadRegions(JSON5.parse(previousTranscriptions), wavesurfer);
  });

  wavesurfer.on('region-click', function(r, e) {
    e.stopPropagation();
    e.shiftKey ? r.playLoop() : r.play();
  });

  wavesurfer.on('region-click', function(r) {
    var form = document.forms.transcription;
    var transcriptionArea = document.getElementById('transcription-area');

    showArea(transcriptionArea);

    (form.elements.start_time.value = r.start),
        (form.elements.end_time.value = r.end);

    var otherVal = null;

    $('#topic option').each(function() {
      if ($(this).text() === 'Other') {
        otherVal = $(this).val();
      }
    });

    if (r.data.topic === otherVal) {
      $('#other_topic').show();
    } else {
      $('#other_topic').hide();
    }

    if (r.data.topic === undefined) {
      $("#topic").val($("#topic option:first").val());
    }

    form.elements.topic.value = r.data.topic || form.elements.topic.value;
    form.elements.other_topic.value = r.data.other_topic || null;
    form.elements.transcription.value = r.data.transcription || '';

    document.getElementById('saveSegment').onclick = function(e) {
      e.preventDefault();
      r.update({
        start: form.elements.start_time.value,
        end: form.elements.end_time.value,
        data: {
          transcription: form.elements.transcription.value,
          topic: form.elements.topic.value,
          other_topic: form.elements.other_topic.value
        }
      });
      hideArea(transcriptionArea);
    };

    form.onreset = function() {
      hideArea(transcriptionArea);
      form.dataset.region = null;
    };
    form.dataset.region = r.id;
  });

  wavesurfer.on('region-updated', function(r) {
    if (!r.minLength) {
      r.minLength = 0.1;
    }
    if (!r.maxLength) {
      r.maxLength = 10;
    }
    saveRegions(wavesurfer);
  });

  wavesurfer.on('region-removed', function() {
    saveRegions(wavesurfer);
  });
  wavesurfer.on('region-in', function(region) {
    showNote(region);
  });

  wavesurfer.on('region-out', function() {
    showNote(null);
  });

  wavesurfer.on('region-play', function(r) {
    r.once('out', function() {
      wavesurfer.play(r.start);
      wavesurfer.pause();
    });
  });

  $('#zoomSlider').change(function () {
    wavesurfer.zoom(Number($(this).val()));
  });

  $('#deleteSegment').click(function() {
    var form = document.forms.transcription;
    var regionId = form.dataset.region;
    if (regionId) {
      wavesurfer.regions.list[regionId].remove();
      form.reset();
    }
  });

  $('#other_topic').hide();

  $('#topic').on('change', function (e) {
    var optionSelected = $(this).find("option:selected");
    var textSelected   = optionSelected.text();

    if (textSelected === 'Other') {
      $('#other_topic').show();
    } else {
      $('#other_topic').hide();
    }
  });
});

function saveRegions(wavesurfer) {

  var transcriptions =
      JSON.stringify(Object.keys(wavesurfer.regions.list).map(function(id) {
        var r = wavesurfer.regions.list[id];
        r.end = Math.abs(r.end - r.start) > 10 ? r.start + 10 : r.end;
        return {start: r.start, end: r.end, data: r.data};
      }));
  document.getElementById('segmented_transcription').value = transcriptions;
}

function loadRegions(regions, wavesurfer) {
  regions.forEach(function(region) {
    wavesurfer.addRegion(region);
  });
}

function showArea(transcriptionArea) {
  transcriptionArea.classList.add('show');
  transcriptionArea.classList.remove('hide');
}

function hideArea(transcriptionArea) {
  transcriptionArea.classList.add('hide');
  transcriptionArea.classList.remove('show');
}

function showNote(region) {
  if (!showNote.el) {
    showNote.el = document.querySelector('#subtitle');
  }
  showNote.el.textContent = (region && region.data.transcription) || '–';
}
