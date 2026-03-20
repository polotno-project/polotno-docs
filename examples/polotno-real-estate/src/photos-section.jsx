import React from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { ImagesGrid } from 'polotno/side-panel/images-grid';
import { getImageSize, getCrop } from 'polotno/utils/image';
import { selectImage } from 'polotno/side-panel/select-image';

const images = [
  { url: './photos/declutter-exterior-input@2x.jpg' },
  { url: './photos/declutter-interior-input.png' },
  { url: './photos/empty-room-input-image@2x.jpg' },
  { url: './photos/improve-lighting-input@2x.jpg' },
  { url: './photos/replace-weather-input@2x.jpg' },
  { url: './photos/virtual-stage-input@2x.jpg' },
];

const PhotosIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M14.25 10.5C14.695 10.5 15.13 10.368 15.5 10.1208C15.87 9.87357 16.1584 9.52217 16.3287 9.11104C16.499 8.69991 16.5436 8.24751 16.4568 7.81105C16.37 7.37459 16.1557 6.97368 15.841 6.65901C15.5263 6.34434 15.1254 6.13005 14.689 6.04323C14.2525 5.95642 13.8001 6.00097 13.389 6.17127C12.9778 6.34157 12.6264 6.62996 12.3792 6.99997C12.132 7.36998 12 7.80499 12 8.25C12 8.84674 12.2371 9.41903 12.659 9.84099C13.081 10.2629 13.6533 10.5 14.25 10.5Z"
      fill="white"
    />
    <path
      d="M19.5 3H4.5C4.10218 3 3.72064 3.15804 3.43934 3.43934C3.15804 3.72064 3 4.10218 3 4.5V19.5C3 19.8978 3.15804 20.2794 3.43934 20.5607C3.72064 20.842 4.10218 21 4.5 21H19.5C19.8978 21 20.2794 20.842 20.5607 20.5607C20.842 20.2794 21 19.8978 21 19.5V4.5C21 4.10218 20.842 3.72064 20.5607 3.43934C20.2794 3.15804 19.8978 3 19.5 3ZM19.5 19.5H4.5V15L8.25 11.25L12.4425 15.4425C12.7235 15.7219 13.1037 15.8787 13.5 15.8787C13.8963 15.8787 14.2765 15.7219 14.5575 15.4425L15.75 14.25L19.5 18V19.5ZM19.5 15.8775L16.8075 13.185C16.5265 12.9056 16.1463 12.7488 15.75 12.7488C15.3537 12.7488 14.9735 12.9056 14.6925 13.185L13.5 14.3775L9.3075 10.185C9.02646 9.90562 8.64628 9.74881 8.25 9.74881C7.85372 9.74881 7.47354 9.90562 7.1925 10.185L4.5 12.8775V4.5H19.5V15.8775Z"
      fill="white"
    />
  </svg>
);

const PhotosPanel = observer(({ store }) => {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ImagesGrid
        images={images}
        getPreview={(image) => image.url}
        onSelect={async (image, pos, element) => {
          const src = image.url;
          selectImage({
            src: src,
            store,
            droppedPos: pos,
            targetElement: element,
          });
        }}
        rowsNumber={2}
        isLoading={false}
        loadMore={false}
      />
    </div>
  );
});

export const PhotosSection = {
  name: 'photos',
  Tab: (props) => (
    <SectionTab name="Photos" {...props}>
      <PhotosIcon />
    </SectionTab>
  ),
  Panel: PhotosPanel,
};
