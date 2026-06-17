import React from 'react';
import { SearchInput } from 'polotno/primitives';
import { useInfiniteAPI } from 'polotno/utils/use-api';
import { selectVideo } from 'polotno/side-panel/select-video';
import { getKey } from 'polotno/utils/validate-key';
import { observer } from 'mobx-react-lite';
import { VideosGrid } from 'polotno/side-panel/videos-grid';
import { SectionTab } from 'polotno/side-panel';

const API = 'https://api.polotno.com/api/pexels/videos';

const getPexelsVideoAPI = ({ query, page }) =>
  `${API}/${
    query ? 'search' : 'popular'
  }?query=${query}&per_page=20&page=${page}&KEY=${getKey()}`;

const VideosIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M13.5 11.25H10.5V8.25H9V11.25H6V12.75H9V15.75H10.5V12.75H13.5V11.25Z"
      fill="white"
    />
    <path
      d="M15.75 19.5H3C2.60232 19.4995 2.22105 19.3414 1.93984 19.0602C1.65864 18.779 1.50046 18.3977 1.5 18V6C1.50046 5.60232 1.65864 5.22105 1.93984 4.93984C2.22105 4.65864 2.60232 4.50046 3 4.5H15.75C16.1477 4.50046 16.529 4.65864 16.8102 4.93984C17.0914 5.22105 17.2495 5.60232 17.25 6V9.04245L21.3142 6.13995C21.4263 6.05975 21.5583 6.01201 21.6957 6.00196C21.8332 5.99192 21.9708 6.01996 22.0933 6.08301C22.2159 6.14606 22.3187 6.24167 22.3904 6.35934C22.4622 6.47701 22.5001 6.61218 22.5 6.75V17.25C22.5001 17.3878 22.4622 17.523 22.3904 17.6407C22.3187 17.7584 22.2159 17.854 22.0933 17.9171C21.9708 17.9801 21.8332 18.0082 21.6958 17.9981C21.5583 17.9881 21.4263 17.9403 21.3142 17.8601L17.25 14.9576V18C17.2495 18.3977 17.0914 18.779 16.8102 19.0602C16.529 19.3414 16.1477 19.4995 15.75 19.5ZM3 6V18.0007L15.75 18V13.5C15.7499 13.3622 15.7878 13.227 15.8596 13.1093C15.9313 12.9916 16.0341 12.896 16.1567 12.8329C16.2792 12.7699 16.4168 12.7418 16.5542 12.7519C16.6917 12.7619 16.8237 12.8097 16.9358 12.8899L21 15.7924V8.20755L16.9358 11.1101C16.8237 11.1902 16.6917 11.238 16.5543 11.248C16.4168 11.2581 16.2793 11.23 16.1567 11.167C16.0341 11.1039 15.9313 11.0083 15.8596 10.8907C15.7878 10.773 15.7499 10.6378 15.75 10.5V6H3Z"
      fill="white"
    />
  </svg>
);

const VideoPanel = observer(({ store }) => {
  const { setQuery, loadMore, isReachingEnd, data, isLoading, error } =
    useInfiniteAPI({
      defaultQuery: 'real estate',
      getAPI: ({ page, query }) => getPexelsVideoAPI({ page, query }),
      getSize: (lastResponse) =>
        lastResponse.total_results / lastResponse.per_page,
    });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <SearchInput
        placeholder="Search videos..."
        onChange={(e) => {
          setQuery(e.target.value);
        }}
        style={{
          marginBottom: '20px',
        }}
      />
      <p style={{ textAlign: 'center' }}>
        Videos by{' '}
        <a href="https://www.pexels.com/" target="_blank" rel="noreferrer">
          Pexels
        </a>
      </p>
      <VideosGrid
        items={data
          ?.map((item) => item.videos)
          .flat()
          .filter(Boolean)}
        onSelect={async (image, pos, element) => {
          const src =
            image.video_files.find((f) => f.quality === 'hd')?.link ||
            image.video_files[0].link;

          selectVideo({
            src,
            store,
            droppedPos: pos,
            targetElement: element,
            attrs: {
              width: image.width,
              height: image.height,
            },
          });
        }}
        isLoading={isLoading}
        error={error}
        loadMore={!isReachingEnd && loadMore}
        getCredit={(image) => (
          <span>
            Video by{' '}
            <a href={image.user.url} target="_blank" rel="noreferrer">
              {image.user.name}
            </a>{' '}
            on{' '}
            <a
              href="https://pexels.com/?utm_source=polotno&utm_medium=referral"
              target="_blank"
              rel="noreferrer noopener"
            >
              Pexels
            </a>
          </span>
        )}
      />
    </div>
  );
});

export const VideoSection = {
  name: 'videos',
  Tab: (props) => (
    <SectionTab name="Videos" {...props}>
      <VideosIcon />
    </SectionTab>
  ),
  Panel: VideoPanel,
};
