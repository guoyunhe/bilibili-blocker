import type { HttpContext } from '@adonisjs/core/http';

import UserTransformer from '#transformers/user_transformer';

export default class ProfileController {
  async show({ auth, serialize }: HttpContext) {
    return serialize(UserTransformer.transform(auth.getUserOrFail()));
  }
}
