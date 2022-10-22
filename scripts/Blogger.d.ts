export interface BloggerComment {
  kind: "blogger#comment";
  status: string;
  id: string;
  inReplyTo: {
    id: string;
  };
  post: {
    id: string;
  };
  blog: {
    id: string;
  };
  published: string;
  updated: string;
  selfLink: string;
  content: string;
  author: {
    id: string;
    displayName: string;
    url: string;
    image: {
      url: string;
    };
  };
}

export interface BloggerPostItem {
  kind: "blogger#post";
  id: string;
  blog: {
    id: string;
  };
  published: string;
  updated: string;
  url: string;
  selfLink: string;
  title: string;
  titleLink: string;
  content: string;
  images: [
    {
      url: string;
    }
  ];
  customMetaData: string;
  author: {
    id: string;
    displayName: string;
    url: string;
    image: {
      url: string;
    };
  };
  replies: {
    totalItems: number;
    selfLink: string;
    items: BloggerComment[];
  };
  labels: [string];
  location: {
    name: string;
    lat: number;
    lng: number;
    span: string;
  };
  status: string;
}

export interface BloggerPostList {
  kind: "blogger#postList";
  nextPageToken?: string;
  items?: BloggerPostItem[];
}
