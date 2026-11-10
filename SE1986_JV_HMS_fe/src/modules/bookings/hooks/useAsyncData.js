import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Nạp dữ liệu async cho các trang booking (mock và API dùng chung contract).
 * Trả về `{ data, loading, error, refetch }`; `refetch` dùng cho nút Tải lại và
 * khi đơn hết hạn giữ chỗ.
 */
export const useAsyncData = (loader, deps = []) => {
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ data: null, loading: true, error: '' });

  useEffect(() => {
    let live = true;

    Promise.resolve()
      .then(() => loaderRef.current())
      .then((data) => {
        if (live) {
          setState({ data, loading: false, error: '' });
        }
      })
      .catch((caught) => {
        if (live) {
          const message =
            caught?.response?.status === 502
              ? 'Không kết nối được với máy chủ đặt phòng. Hãy thử lại khi máy chủ hoạt động.'
              : caught?.message || 'Không tải được dữ liệu đặt phòng.';
          setState({
            data: null,
            loading: false,
            error: message,
          });
        }
      });

    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return { ...state, refetch };
};
