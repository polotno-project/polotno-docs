import React from 'react';
import styled from 'polotno/utils/styled';

const GridContainer = styled('div')<{ columns?: number }>`
    display: grid;
    grid-template-columns: repeat(${props => props.columns || 3}, 1fr);
    gap: 10px;
    padding: 10px;
    height: calc(100% - 70px);
    overflow-y: auto;
`;

const GridItem = styled('div')`
    position: relative;
    cursor: pointer;
    display: flex;
    flex-direction: column;
`;

const ItemPreview = styled('div')`
    width: 100%;
    aspect-ratio: 1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    transition: transform 0.2s ease;

    &:hover {
        transform: scale(1.05);
    }
`;

const ItemInfo = styled('div')`
    padding: 8px;
    font-size: 12px;
    text-align: center;
`;

const ItemActions = styled('div')`
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.2s ease;

    ${GridItem}:hover & {
        opacity: 1;
    }
`;

const LoadingIndicator = styled('div')`
    grid-column: 1 / -1;
    display: flex;
    justifyContent: center;
    padding: 20px;
`;

const EndMessage = styled('div')`
    grid-column: 1 / -1;
    text-align: center;
    padding: 20px;
    color: #666;
    font-size: 14px;
`;

interface GenericGridProps<T> {
  items: T[] | undefined;
  columns?: number;
  isLoadingItems: boolean;
  isReachingEnd: boolean;
  renderItem: (item: T) => React.ReactNode;
  loadMore?: (() => void) | false | null | undefined;
  endMessage?: string;
}

export const Grid = <T extends { id: number | string }>(
  {
    items,
    columns = 3,
    isLoadingItems,
    isReachingEnd,
    renderItem,
    loadMore,
    endMessage
  }: GenericGridProps<T>) => {
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const pixelsLeft = target.scrollHeight - target.scrollTop - target.offsetHeight;
    if (loadMore && !isLoadingItems && pixelsLeft < 200 && !isReachingEnd) {
      loadMore();
    }
  };
  
  return (
    <GridContainer columns={columns} onScroll={handleScroll}>
      {items?.map((item) => renderItem(item))}
      
      {isLoadingItems && (
        <LoadingIndicator>
          <div className="bp5-spinner bp5-small">
            <svg viewBox="0 0 100 100">
              <path className="bp5-spinner-track"
                    d="M 50,50 m 0,-44.5 a 44.5,44.5 0 1 1 0,89 a 44.5,44.5 0 1 1 0,-89"></path>
              <path className="bp5-spinner-head"
                    d="M 50,50 m 0,-44.5 a 44.5,44.5 0 1 1 0,89 a 44.5,44.5 0 1 1 0,-89"></path>
            </svg>
          </div>
        </LoadingIndicator>
      )}
      
      {isReachingEnd && items && items.length > 0 && (
        <EndMessage>
          {endMessage}
        </EndMessage>
      )}
    </GridContainer>
  );
};

export { GridItem, ItemPreview, ItemInfo, ItemActions };