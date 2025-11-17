// Helper function to create virtual DOM nodes (similar to React.createElement)
const h = (type, props, ...children) => {
  return { type, props, children: children || [] };
};

// Function to wrap HTML with Spine Player library and initialization
const wrapHTMLWithSpinePlayer = (htmlContent) => {
  const spinePlayerScript = `
    <link rel="stylesheet" href="https://unpkg.com/@esotericsoftware/spine-player@4.2.*/dist/spine-player.css">
    <script src="https://unpkg.com/@esotericsoftware/spine-player@4.2.*/dist/iife/spine-player.js"></script>
    <script>
      (function() {
        // Initialize Spine Players
        function initSpinePlayers() {
          const containers = document.querySelectorAll('[data-spine-player="true"]');
          
          containers.forEach(container => {
            const containerId = container.id;
            const skeleton = container.getAttribute('data-skeleton');
            const atlas = container.getAttribute('data-atlas');
            
            if (!containerId || !skeleton || !atlas) return;
            
            // Check if already initialized
            if (container.hasAttribute('data-initialized')) return;
            
            // Wait for spine library to be available
            function tryInit() {
              if (window.spine && window.spine.SpinePlayer) {
                try {
                  new window.spine.SpinePlayer(containerId, {
                    skeleton: skeleton,
                    atlas: atlas
                  });
                  container.setAttribute('data-initialized', 'true');
                } catch (error) {
                  console.error('Error initializing Spine Player:', error);
                }
              } else {
                setTimeout(tryInit, 100);
              }
            }
            
            tryInit();
          });
        }
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initSpinePlayers);
        } else {
          // If script loads after DOM is ready, wait a bit for the library
          setTimeout(initSpinePlayers, 100);
        }
      })();
    </script>
  `;

  // Insert the script before closing body tag
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', spinePlayerScript + '</body>');
  } else {
    // If no body tag, append to the end
    return htmlContent + spinePlayerScript;
  }
};

// Function to download a file
const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Custom download function
export const downloadAsHTML = async (store) => {
  try {
    // Export to HTML with custom element hook
    const html = await store.toHTML({
      elementHook: ({ dom, element }) => {
        // Check if element is a spinePlayer
        if (element.type === 'spinePlayer') {
          // Get the original DOM properties
          const originalProps = dom.props || {};
          const originalStyle = originalProps.style || {};

          const containerId = `spine-player-${element.id}`;
          const skeleton = element.skeleton || '';
          const atlas = element.atlas || '';

          // Create spine player container
          const spineContainer = h('div', {
            id: containerId,
            'data-spine-player': 'true',
            'data-skeleton': skeleton,
            'data-atlas': atlas,
            style: {
              ...originalStyle,
              position: originalStyle.position || 'absolute',
              width: element.width,
              height: element.height,
            },
          });

          return spineContainer;
        }

        return dom;
      },
    });

    // Wrap HTML with Spine Player library and initialization
    const wrappedHTML = wrapHTMLWithSpinePlayer(html);

    // Download the file
    downloadFile(wrappedHTML, 'polotno-export.html', 'text/html');
  } catch (error) {
    console.error('Error exporting to HTML:', error);
    alert('Failed to export HTML. Please try again.');
  }
};
