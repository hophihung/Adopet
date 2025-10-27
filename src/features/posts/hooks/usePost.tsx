import { useQuery } from '@tanstack/react-query';
import { PostService } from '../services/post.service';

export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: PostService.getAll,
  });
}
