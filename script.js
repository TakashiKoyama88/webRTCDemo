const Peer = window.Peer;

(async function main() {
  const localVideo = document.getElementById('js-local-stream');
  const joinTrigger = document.getElementById('js-join-trigger');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id');
  const localText = document.getElementById('js-local-text');
  const sendTrigger = document.getElementById('js-send-trigger');
  const messages = document.getElementById('js-messages');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');
  const muteTrigger = document.getElementById('js-mute-trigger');
  const muteState = document.getElementById('js-mute-state');
  const bigOne = document.getElementById('js-remote-stream-big-one');
  const receiveOnlyJoinTrigger = document.getElementById('js-receive-only-join-trigger');
  
  let userNumber = 0;

  meta.innerText = `
    UA: ${navigator.userAgent}
    SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
  `.trim();


  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .catch(console.error);

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);

  // eslint-disable-next-line require-atomic-updates
  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  }));


  muteTrigger.addEventListener('click', () =>{
    if(localVideo.muted === true){
      localVideo.muted =false;
      muteState.innerHTML='Mute State: Not muted';
    }else{
      localVideo.muted = true;
      muteState.innerHTML='Mute State: Muted';
    }
  })

  // Register join handler
  joinTrigger.addEventListener('click', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }

    const room = peer.joinRoom(roomId.value, {
      mode: 'mesh',
      stream: localStream,
    });

    room.once('open', () => {
      messages.textContent += '=== You joined ===\n';
    });
    room.on('peerJoin', peerId => {
      messages.textContent += `=== ${peerId} joined ===\n`;
    });

    // Render remote stream for new peer join in the room
    room.on('stream', async stream => {
      const newVideo = document.createElement('video');
      newVideo.srcObject = stream;
      newVideo.playsInline = true;

      // mark peerId to find it later at peerLeave event
      newVideo.setAttribute('data-peer-id', stream.peerId);
      remoteVideos.append(newVideo);
      //bigOne.append(newVideo);
      await newVideo.play().catch(console.error);

      // ID name
      const newID = document.createElement('button');
      newID.id = `${stream.peerId}`;
      newID.className = 'id-name';
      remoteVideos.append(newID);
    
      const useId = document.getElementById(`${stream.peerId}`);
      useId.textContent += `--${stream.peerId}--`;

      useId.addEventListener('click', () =>{
        console.log(`${stream.peerId}`);
        bigOne.append(newVideo);

        const anotherID = document.createElement('p');
        anotherID.id = `-${stream.peerId}`;
        anotherID.className = '-id-name';
        bigOne.append(anotherID);

        const usedId = document.getElementById(`-${stream.peerId}`);
        usedId.textContent += `~~${stream.peerId}~~`;

        useId.remove();

      });
    });

    room.on('data', ({ data, src }) => {
      // Show a message sent to the room and who sent
      messages.textContent += `${src}: ${data}\n`;
    });

    // for closing room members
    room.on('peerLeave', peerId => {
      const remoteVideo = remoteVideos.querySelector(
        `[data-peer-id="${peerId}"]`
      );
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
      remoteVideo.remove();

      messages.textContent += `=== ${peerId} left ===\n`;
      
      const remoteVideoId = remoteVideos.querySelector(
        `[id="${peerId}"]`
      );
      remoteVideoId.remove();
    });

    // for closing myself
    room.once('close', () => {
      sendTrigger.removeEventListener('click', onClickSend);
      messages.textContent += '== You left ===\n';

      Array.from(remoteVideos.children).forEach(remoteVideo => {
        if(remoteVideo.className === 'id-name'){
          remoteVideo.remove();
        } else{
          remoteVideo.srcObject.getTracks().forEach(track => track.stop());
          remoteVideo.srcObject = null;
          remoteVideo.remove();
        }
      });
      
      Array.from(bigOne.children).forEach(remoteVideo => {
        if(remoteVideo.className === '-id-name'){
          remoteVideo.remove();
        } else{
          remoteVideo.srcObject.getTracks().forEach(track => track.stop());
          remoteVideo.srcObject = null;
          remoteVideo.remove();
        }
      });

    });

    sendTrigger.addEventListener('click', onClickSend);
    leaveTrigger.addEventListener('click', () => room.close(), { once: true });

    function onClickSend() {
      // Send message to all of the peers in the room via websocket
      room.send(localText.value);

      messages.textContent += `${peer.id}: ${localText.value}\n`;
      localText.value = '';
    }

  });

  // Register join handler(receive only)
  // receiveOnlyJoinTrigger.addEventListener('click', () => {
  //   // Note that you need to ensure the peer has connected to signaling server
  //   // before using methods of peer instance.
  //   if (!peer.open) {
  //     return;
  //   }

  //   const room = peer.joinRoom(roomId.value, {
  //     mode: 'mesh',
  //   });

  //   room.once('open', () => {
  //     messages.textContent += '=== You joined (receive only)===\n';
  //   });
  //   room.on('peerJoin', peerId => {
  //     messages.textContent += `=== ${peerId} joined (receive only)===\n`;
  //   });

  //   // Render remote stream for new peer join in the room
  //   room.on('stream', async stream => {
  //     const newVideo = document.createElement('video');
  //     newVideo.srcObject = stream;
  //     newVideo.playsInline = true;

  //     // mark peerId to find it later at peerLeave event
  //     newVideo.setAttribute('data-peer-id', stream.peerId);
  //     remoteVideos.append(newVideo);
  //     //bigOne.append(newVideo);
  //     await newVideo.play().catch(console.error);

  //     const newID = document.createElement('p');
  //     newID.id = `${stream.peerId}`;
  //     newID.className = 'id-name';
  //     remoteVideos.append(newID);
    
  //     const useId = document.getElementById(`${stream.peerId}`);
  //     useId.textContent += `--${stream.peerId}--`;
  //   });

  //   room.on('data', ({ data, src }) => {
  //     // Show a message sent to the room and who sent
  //     messages.textContent += `${src}: ${data}\n`;
  //   });

  //   // for closing room members
  //   room.on('peerLeave', peerId => {
  //     const remoteVideo = remoteVideos.querySelector(
  //       `[data-peer-id="${peerId}"]`
  //     );
  //     remoteVideo.srcObject.getTracks().forEach(track => track.stop());
  //     remoteVideo.srcObject = null;
  //     remoteVideo.remove();

  //     messages.textContent += `=== ${peerId} left ===\n`;
      
  //     const remoteVideoId = remoteVideos.querySelector(
  //       `[id="${peerId}"]`
  //     );
  //     remoteVideoId.remove();
  //   });

  //   // for closing myself
  //   room.once('close', () => {
  //     sendTrigger.removeEventListener('click', onClickSend);
  //     messages.textContent += '== You left ===\n';

  //     //It's not a good way to do it, so it needs improvement.
  //     //remoteVideos.innerHTML = '';

  //     // Array.from(remoteVideos.children).forEach(remoteVideo => {
  //     //   remoteVideo.srcObject.getTracks().forEach(track => track.stop());
  //     //   remoteVideo.srcObject = null;
  //     //   remoteVideo.remove();
  //     // });

  //     Array.from(remoteVideos.children).forEach(remoteVideo => {
  //       if(remoteVideo.className === 'id-name'){
  //         remoteVideo.remove();
  //       } else{
  //         remoteVideo.srcObject.getTracks().forEach(track => track.stop());
  //         remoteVideo.srcObject = null;
  //         remoteVideo.remove();
  //       }
  //     });
      

  //   });

  //   sendTrigger.addEventListener('click', onClickSend);
  //   leaveTrigger.addEventListener('click', () => room.close(), { once: true });

  //   function onClickSend() {
  //     // Send message to all of the peers in the room via websocket
  //     room.send(localText.value);

  //     messages.textContent += `${peer.id}: ${localText.value}\n`;
  //     localText.value = '';
  //   }
  // });

  peer.on('error', console.error);
})();
