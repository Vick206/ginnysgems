function studioPhoto(stone) {
  const image=document.createElement('img');
  image.className='showcase-image'; image.src=stone.photo;
  image.srcset=`${stone.photoSmall} 600w, ${stone.photo} 1200w`;
  image.sizes='(max-width:540px) 86vw, (max-width:850px) 40vw, 26vw';
  image.alt=stone.alt;image.width=1200;image.height=900;
  image.loading='lazy';image.decoding='async';return image;
}

const studioGallery=document.querySelector('#studio-gallery');
if(studioGallery) for(const stone of STUDIO_CATALOG) {
  const card=document.createElement('article');card.className='gallery-item';card.dataset.stone=stone.id;
  const frame=document.createElement('div');frame.className='showcase-photo';
  const placeholder=document.createElement('div');placeholder.className='photo-placeholder';placeholder.textContent='Photograph unavailable';
  frame.append(studioPhoto(stone),placeholder);
  addStudioOverlays(frame,stone);
  const name=document.createElement('h3');name.textContent=stone.name;
  const spec=document.createElement('p');spec.className='spec';spec.textContent=stone.cutName;
  const description=document.createElement('p');description.textContent=stone.description;
  const pair=document.createElement('div');pair.className='render-preview';
  if(!stone.render)pair.textContent='Cut render · in preparation';
  const link=document.createElement('a');link.href=`visualizer.html?stone=${encodeURIComponent(stone.id)}`;link.className='text-link';link.textContent=stone.render?'Photo & 3D cut render →':'Photo & cut details →';
  card.append(frame,name,spec,description);if(!stone.render)card.append(pair);card.append(link);studioGallery.append(card);
}

function addStudioOverlays(frame,stone){
  if(!stone.render)return;
  for(const [kind,source,label] of [['wireframe',stone.wireframe,'Wireframe'],['render',stone.render,'Cut render']]){
    const overlay=document.createElement('figure');overlay.className=`photo-overlay photo-overlay-${kind}`;
    const image=document.createElement('img');image.src=source;image.width=384;image.height=384;image.alt=`${stone.cutName} ${label.toLowerCase()}`;image.loading='lazy';image.decoding='async';
    const caption=document.createElement('figcaption');caption.textContent=label;
    image.addEventListener('error',()=>overlay.remove());overlay.append(image,caption);frame.append(overlay);
  }
}

// Keep the photo placeholder until a supplied image successfully loads.
document.querySelectorAll('.showcase-image').forEach((image) => {
  const frame = image.closest('.showcase-photo');
  const updatePhoto = () => {
    frame.classList.toggle('has-photo', image.hasAttribute('src') && image.complete && image.naturalWidth > 0);
  };
  image.addEventListener('load', updatePhoto);
  image.addEventListener('error', () => frame.classList.remove('has-photo'));
  updatePhoto();
});

const form = document.querySelector('#commission-form');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = new FormData(form).get('name').trim();
  document.querySelector('#form-note').textContent = `Thank you, ${name}. Your inquiry is ready for Ginny.`;
  form.querySelector('button').textContent = 'Inquiry prepared ✓';
});
