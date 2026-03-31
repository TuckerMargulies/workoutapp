// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => {
  const store = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key) => Promise.resolve(store[key] ?? null)),
      setItem: jest.fn((key, value) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach((k) => delete store[k]);
        return Promise.resolve();
      }),
    },
  };
});

// Mock expo-av
jest.mock("expo-av", () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: "granted" })
    ),
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    Recording: {
      createAsync: jest.fn(() =>
        Promise.resolve({
          recording: {
            stopAndUnloadAsync: jest.fn(),
            getURI: jest.fn(() => "file:///test-audio.m4a"),
          },
        })
      ),
    },
    RecordingOptionsPresets: { HIGH_QUALITY: {} },
    Sound: {
      createAsync: jest.fn(() =>
        Promise.resolve({
          sound: {
            unloadAsync: jest.fn(),
            setOnPlaybackStatusUpdate: jest.fn(),
          },
        })
      ),
    },
  },
}));

// Mock expo-file-system
jest.mock("expo-file-system", () => ({
  readAsStringAsync: jest.fn(() => Promise.resolve("base64audiodata")),
}));

// Mock expo-speech
jest.mock("expo-speech", () => ({
  speak: jest.fn((text, opts) => {
    if (opts?.onDone) opts.onDone();
  }),
  stop: jest.fn(),
}));

// Mock supabase client
jest.mock("./src/lib/supabase", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve({ data: { user: { id: "test-user-123" } } })
      ),
    },
    from: jest.fn(() => ({
      upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    functions: {
      invoke: jest.fn(() =>
        Promise.resolve({ data: null, error: { message: "mocked" } })
      ),
    },
  })),
}));
